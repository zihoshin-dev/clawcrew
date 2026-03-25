import { nanoid } from 'nanoid';
import { createEventBus, EventBus } from './event-bus.js';
import type { AigoraEvents } from './event-bus.js';
import { AgentRegistry } from './registry.js';
import { AgentStatus, Phase, AgentRole } from './types.js';
import type { AigoraConfig, Project } from './types.js';
import { LLMRouter } from './llm-router.js';
import { AgentFactory } from '../agents/factory.js';
import type { BaseAgent } from '../agents/base.js';
import { createAdapter } from '../messenger/factory.js';
import type { MessengerAdapter } from '../messenger/adapter.js';
import { createLogger } from './logger.js';
import type { Logger } from './logger.js';
import { TeamSizer } from '../orchestrator/team-sizer.js';
import { CycleGuard } from '../orchestrator/cycle-guard.js';
import phaseTeamsJson from '../../config/phase-teams.json' assert { type: 'json' };
import type { ProjectStore } from '../persistence/types.js';
import { Pipeline } from '../orchestrator/pipeline.js';
import { PhaseManager } from '../orchestrator/phase-manager.js';
import { CostTracker } from './cost-tracker.js';
import { createDefaultRegistry } from '../tools/index.js';
import type { ToolRegistry } from '../tools/index.js';
import { MessageAuthenticator } from '../messenger/auth.js';

export type { AigoraConfig };

export interface EngineStatus {
  running: boolean;
  projectCount: number;
  agentCount: number;
  startedAt?: Date;
}

// ---------------------------------------------------------------------------
// OrchestrationEngine
// ---------------------------------------------------------------------------

export class OrchestrationEngine {
  private readonly config: AigoraConfig;
  private readonly bus: EventBus<AigoraEvents>;
  private readonly registry: AgentRegistry;
  private readonly projects: Map<string, Project> = new Map();
  private readonly llmRouter: LLMRouter;
  private readonly messengers: MessengerAdapter[] = [];
  private readonly projectAgents: Map<string, BaseAgent[]> = new Map();
  private readonly teamSizer: TeamSizer;
  private readonly cycleGuards: Map<string, CycleGuard> = new Map();
  private readonly projectStore: ProjectStore | undefined;
  private readonly pipeline: Pipeline;
  private readonly phaseManager: PhaseManager;
  private readonly costTracker: CostTracker;
  private readonly toolRegistry: ToolRegistry;

  private readonly logger: Logger;
  private running = false;
  private startedAt: Date | undefined;

  constructor(config: AigoraConfig, projectStore?: ProjectStore) {
    this.config = config;
    this.bus = createEventBus();
    this.registry = AgentRegistry.getInstance();
    this.llmRouter = new LLMRouter();
    this.logger = createLogger('aigora:engine', config.logLevel ?? 'info');
    this.teamSizer = new TeamSizer(phaseTeamsJson as Record<string, { required: string[]; optional?: string[] }>);
    this.projectStore = projectStore;
    this.pipeline = new Pipeline();
    this.phaseManager = new PhaseManager(this.pipeline, this.bus);
    this.costTracker = new CostTracker();
    this.toolRegistry = createDefaultRegistry();
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('OrchestrationEngine is already running.');
    }

    this.running = true;
    this.startedAt = new Date();

    this.attachCoreListeners();
    await this.connectMessengers();

    this.logger.info('OrchestrationEngine started.');
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    // Mark all registered agents offline
    for (const agent of this.registry.getAll()) {
      try {
        this.registry.updateStatus(agent.id, AgentStatus.OFFLINE);
      } catch {
        // best-effort
      }
    }

    this.bus.removeAllListeners();
    this.running = false;
    this.startedAt = undefined;

    this.logger.info('OrchestrationEngine stopped.');
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Creates a new project from the given agenda string and returns its id.
   * Emits AgendaSubmitted so any subscribed agents can pick up the work.
   */
  async submitAgenda(agenda: string, channel: string): Promise<string> {
    this.assertRunning();

    const projectId = nanoid();
    const now = new Date();

    const project: Project = {
      id: projectId,
      agenda,
      channel,
      phase: Phase.RESEARCH,
      status: 'active',
      agentIds: [],
      tasks: [],
      messages: [],
      createdAt: now,
      updatedAt: now,
    };

    this.projects.set(projectId, project);
    this.projectStore?.saveProject(project);

    this.bus.emit('AgendaSubmitted', {
      projectId,
      agenda,
      channel,
      submittedAt: now,
    });

    this.logger.info(`Agenda submitted — project ${projectId}: "${agenda}"`);

    return projectId;
  }

  getProject(projectId: string): Project | undefined {
    const p = this.projects.get(projectId);
    return p !== undefined ? { ...p } : undefined;
  }

  getStatus(): EngineStatus {
    return {
      running: this.running,
      projectCount: this.projects.size,
      agentCount: this.registry.count(),
      startedAt: this.startedAt,
    };
  }

  /** Expose the event bus for external subscribers (e.g. messenger adapters). */
  getEventBus(): EventBus<AigoraEvents> {
    return this.bus;
  }

  /** Expose the registry for agent management. */
  getRegistry(): AgentRegistry {
    return this.registry;
  }

  // ---------------------------------------------------------------------------
  // Internal helpers
  // ---------------------------------------------------------------------------

  /**
   * Drive one think/act cycle for all agents assigned to a project.
   */
  async runAgentCycle(projectId: string): Promise<void> {
    const project = this.projects.get(projectId);
    if (project === undefined) return;
    const agents = this.projectAgents.get(projectId) ?? [];

    // Initialise a CycleGuard per project if not already present
    if (!this.cycleGuards.has(projectId)) {
      this.cycleGuards.set(projectId, new CycleGuard());
    }
    const guard = this.cycleGuards.get(projectId)!;

    const stopCheck = guard.shouldStop();
    if (stopCheck.stop) {
      this.logger.warn(`[CycleGuard] Stopping project ${projectId}: ${stopCheck.reason}`);
      return;
    }

    const cycleOutputs: string[] = [];
    for (const agent of agents) {
      const thought = await agent.think({
        projectId,
        phase: project.phase,
        agenda: project.agenda,
        recentMessages: project.messages.slice(-20),
      });
      const result = await agent.act(thought);
      this.logger.debug(`[AgentCycle] ${agent.name} → ${result.action}: ${result.output.slice(0, 100)}`);
      cycleOutputs.push(result.output);

      // Track cost if the agent's last LLM response is available via metadata
      if (result.artifacts?.['llmResponse'] !== undefined) {
        const llmResp = result.artifacts['llmResponse'] as import('./llm-router.js').LlmResponse;
        this.costTracker.track(agent.id, llmResp, projectId);
      }
    }

    // Record the combined output of this cycle for oscillation detection
    guard.recordCycle(cycleOutputs.join('\n'));

    // Check if the pipeline can advance to the next phase
    const gateCtx = {
      artifacts: this.phaseManager.getAllArtifacts(),
      tasks: project.tasks,
    };
    if (this.pipeline.canAdvance(gateCtx)) {
      try {
        const nextPhase = this.pipeline.advance(gateCtx);
        await this.phaseManager.startPhase(nextPhase);
        this.logger.info(`[Pipeline] Advanced to phase: ${nextPhase}`);
      } catch {
        // gate conditions may not be met — safe to ignore
      }
    }
  }

  /**
   * Continuously run agent cycles for a project until the CycleGuard signals stop.
   */
  async runProjectLoop(projectId: string): Promise<void> {
    const guard = this.cycleGuards.get(projectId) ?? new CycleGuard();
    this.cycleGuards.set(projectId, guard);
    while (!guard.shouldStop().stop) {
      await this.runAgentCycle(projectId);
    }
  }

  private spawnAgentsForProject(projectId: string): void {
    const project = this.projects.get(projectId);
    if (project === undefined) return;

    const recommendation = this.teamSizer.recommend(project.agenda, project.phase);
    this.logger.debug(`[TeamSizer] ${recommendation.reasoning}`);
    const roleNames = recommendation.roles as AgentRole[];
    const agents: BaseAgent[] = [];

    for (const roleName of roleNames) {
      const role = roleName as keyof typeof import('../core/types.js').AgentRole;
      try {
        const agent = AgentFactory.create(role as any);
        agent.setRouter(this.llmRouter);
        agent.setTools(this.toolRegistry);
        this.registry.register({
          id: agent.id,
          name: agent.name,
          role: agent.role,
          status: agent.status,
          capabilities: agent.getCapabilities().map(c => ({ name: c })),
          model: 'auto',
          registeredAt: new Date(),
        });
        agents.push(agent);
      } catch {
        // skip unknown roles
      }
    }

    this.projectAgents.set(projectId, agents);
    const project2 = this.projects.get(projectId);
    if (project2 !== undefined) {
      project2.agentIds = agents.map(a => a.id);
    }
  }

  private attachCoreListeners(): void {
    this.bus.on('AgendaSubmitted', ({ projectId, agenda }) => {
      this.logger.info(`[AgendaSubmitted] project=${projectId} agenda="${agenda}"`);
      this.spawnAgentsForProject(projectId);
      this.phaseManager.setProjectId(projectId);
      void this.runProjectLoop(projectId).catch((err) =>
        this.logger.error(`Agent cycle error: ${err instanceof Error ? err.message : String(err)}`),
      );
    });

    this.bus.on('PhaseChanged', ({ projectId, previousPhase, currentPhase }) => {
      const project = this.projects.get(projectId);
      if (project !== undefined) {
        project.phase = currentPhase;
        project.updatedAt = new Date();
        this.projectStore?.saveProject(project);
      }
      this.logger.debug(`[PhaseChanged] project=${projectId} ${previousPhase} → ${currentPhase}`);
    });

    this.bus.on('TaskCompleted', ({ projectId, taskId }) => {
      const project = this.projects.get(projectId);
      if (project !== undefined) {
        const task = project.tasks.find((t) => t.id === taskId);
        if (task !== undefined) {
          task.status = 'completed';
          task.completedAt = new Date();
          project.updatedAt = new Date();
        }
      }
    });

    this.bus.on('DeadlockDetected', async ({ projectId, phase, involvedAgents }) => {
      this.logger.warn(`[DeadlockDetected] project=${projectId} phase=${phase} agents=${involvedAgents.join(',')}`);
      const judge = AgentFactory.create(AgentRole.JUDGE);
      judge.setRouter(this.llmRouter);
      const project = this.projects.get(projectId);
      if (project) {
        try {
          const thought = await judge.think({
            projectId,
            phase: project.phase,
            agenda: `DEADLOCK RESOLUTION: ${project.agenda}`,
            recentMessages: project.messages.slice(-30),
          });
          const verdict = await judge.act(thought);
          this.logger.info(`[Judge Verdict] ${verdict.output.slice(0, 200)}`);
        } catch (err) {
          this.logger.error(`[Judge] Failed to render verdict: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    });

    this.bus.on('ErrorOccurred', ({ error, context, projectId }) => {
      this.logger.error(`[ErrorOccurred] project=${projectId ?? 'global'} context=${context ?? ''}: ${error.message}`);
    });
  }

  private async connectMessengers(): Promise<void> {
    for (const messengerConfig of this.config.messengers) {
      try {
        const adapter = createAdapter(messengerConfig);
        adapter.onMessage(async (msg) => {
          this.logger.debug(`[Messenger] Received: ${msg.text.slice(0, 80)}`);
          const auth = new MessageAuthenticator({ rejectBots: true });
          const result = auth.authenticate(msg);
          if (!result.authenticated) return;
          await this.submitAgenda(msg.text, msg.channel);
        });
        await adapter.connect();
        this.messengers.push(adapter);
        this.logger.info(`Messenger connected: type=${messengerConfig.type}`);
      } catch (err) {
        this.logger.warn(`Failed to connect messenger ${messengerConfig.type}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private assertRunning(): void {
    if (!this.running) {
      throw new Error('OrchestrationEngine is not running. Call start() first.');
    }
  }
}
