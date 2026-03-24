import { nanoid } from 'nanoid';
import { createEventBus, EventBus } from './event-bus.js';
import type { AigoraEvents } from './event-bus.js';
import { AgentRegistry } from './registry.js';
import { AgentStatus, Phase } from './types.js';
import type { AigoraConfig, Project } from './types.js';

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

  private running = false;
  private startedAt: Date | undefined;

  constructor(config: AigoraConfig) {
    this.config = config;
    this.bus = createEventBus();
    this.registry = AgentRegistry.getInstance();
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

    this.log('info', 'OrchestrationEngine started.');
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

    this.log('info', 'OrchestrationEngine stopped.');
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

    this.bus.emit('AgendaSubmitted', {
      projectId,
      agenda,
      channel,
      submittedAt: now,
    });

    this.log('info', `Agenda submitted — project ${projectId}: "${agenda}"`);

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

  private attachCoreListeners(): void {
    this.bus.on('AgendaSubmitted', ({ projectId, agenda }) => {
      this.log('debug', `[AgendaSubmitted] project=${projectId} agenda="${agenda}"`);
    });

    this.bus.on('PhaseChanged', ({ projectId, previousPhase, currentPhase }) => {
      const project = this.projects.get(projectId);
      if (project !== undefined) {
        project.phase = currentPhase;
        project.updatedAt = new Date();
      }
      this.log(
        'debug',
        `[PhaseChanged] project=${projectId} ${previousPhase} → ${currentPhase}`,
      );
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

    this.bus.on('DeadlockDetected', ({ projectId, phase, involvedAgents }) => {
      this.log(
        'warn',
        `[DeadlockDetected] project=${projectId} phase=${phase} agents=${involvedAgents.join(',')}`,
      );
    });

    this.bus.on('ErrorOccurred', ({ error, context, projectId }) => {
      this.log(
        'error',
        `[ErrorOccurred] project=${projectId ?? 'global'} context=${context ?? ''}: ${error.message}`,
      );
    });
  }

  private async connectMessengers(): Promise<void> {
    for (const messengerConfig of this.config.messengers) {
      // Messenger adapters are responsible for their own initialization and
      // will receive the event bus via getEventBus(). This method acts as the
      // hook point for future adapter registration.
      this.log(
        'debug',
        `Messenger connector registered: type=${messengerConfig.type}`,
      );
    }
  }

  private assertRunning(): void {
    if (!this.running) {
      throw new Error('OrchestrationEngine is not running. Call start() first.');
    }
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const configLevel = this.config.logLevel ?? 'info';
    const levels: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
    if ((levels[level] ?? 0) >= (levels[configLevel] ?? 1)) {
      const prefix = `[aigora:engine] [${level.toUpperCase()}]`;
      // eslint-disable-next-line no-console
      console.log(`${prefix} ${message}`);
    }
  }
}
