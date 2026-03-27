import { nanoid } from 'nanoid';
import { createRequire } from 'module';
import { createEventBus, EventBus } from './event-bus.js';
import type { AigoraEvents } from './event-bus.js';
import { AgentRegistry } from './registry.js';
import {
  type AgentActionEnvelope,
  AgentRole,
  AgentStatus,
  Phase,
  RunMode,
  RunSource,
  RunStatus,
  RunStepStatus,
  type AigoraConfig,
  type ApprovalRequestRecord,
  type Message,
  type Project,
  type Run,
  type RunStatusSummary,
  type RunStep,
  type SubmitRunOptions,
} from './types.js';
import { LLMRouter } from './llm-router.js';
import { AgentFactory } from '../agents/factory.js';
import type { BaseAgent } from '../agents/base.js';
import { createAdapter } from '../messenger/factory.js';
import type { MessengerAdapter } from '../messenger/adapter.js';
import { createLogger } from './logger.js';
import type { Logger } from './logger.js';
import type { ProjectStore } from '../persistence/types.js';
import { InMemoryProjectStore } from '../persistence/sqlite-store.js';
import { CostTracker } from './cost-tracker.js';
import { createDefaultRegistry } from '../tools/index.js';
import type { ToolRegistry } from '../tools/index.js';
import { MessageAuthenticator } from '../messenger/auth.js';
import { PolicyEngine } from '../sandbox/policy-engine.js';
import type { PolicySet } from '../sandbox/policy-engine.js';
import {
  buildActionBatchPreview,
  buildRunStatusSummary,
  createApprovalRecord,
  createDefaultStepsForRun,
  createRunForProject,
  formatRunSummary,
} from './runtime.js';

const require = createRequire(import.meta.url);
const policiesJson = require('../../config/policies.json') as PolicySet;

export type { AigoraConfig };

export interface EngineStatus {
  running: boolean;
  projectCount: number;
  runCount: number;
  queuedRuns: number;
  agentCount: number;
  startedAt?: Date;
}

interface StepExecutionResult {
  summary: string;
  preview?: ReturnType<typeof buildActionBatchPreview>;
  approvalRequired: boolean;
  blockedReason?: string;
}

export class OrchestrationEngine {
  private readonly config: AigoraConfig;
  private readonly bus: EventBus<AigoraEvents>;
  private readonly registry: AgentRegistry;
  private readonly projects: Map<string, Project> = new Map();
  private readonly llmRouter: LLMRouter;
  private readonly messengers: MessengerAdapter[] = [];
  private readonly messengerBySource = new Map<RunSource, MessengerAdapter>();
  private readonly projectStore: ProjectStore;
  private readonly costTracker: CostTracker;
  private readonly toolRegistry: ToolRegistry;
  private readonly logger: Logger;
  private readonly policyEngine: PolicyEngine;
  private readonly runQueue: string[] = [];

  private processingQueue = false;
  private running = false;
  private startedAt: Date | undefined;

  constructor(config: AigoraConfig, projectStore?: ProjectStore) {
    this.config = config;
    applyLlmConfigToEnv(config);
    this.bus = createEventBus();
    this.registry = AgentRegistry.getInstance();
    this.llmRouter = new LLMRouter({
      defaultConfig: config.llm,
      agentOverrides: config.agentLlmOverrides,
    });
    this.logger = createLogger('aigora:engine', config.logLevel ?? 'info');
    this.projectStore = projectStore ?? new InMemoryProjectStore();
    this.costTracker = new CostTracker();
    this.toolRegistry = createDefaultRegistry();
    this.policyEngine = new PolicyEngine(policiesJson);
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('OrchestrationEngine is already running.');
    }

    this.running = true;
    this.startedAt = new Date();
    this.attachCoreListeners();
    await this.connectMessengers();
    this.restorePersistedState();
    void this.processQueuedRuns();

    this.logger.info('OrchestrationEngine started.');
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    for (const agent of this.registry.getAll()) {
      try {
        this.registry.updateStatus(agent.id, AgentStatus.OFFLINE);
      } catch {
      }
    }

    for (const messenger of this.messengers) {
      await messenger.disconnect().catch(() => undefined);
    }

    this.bus.removeAllListeners();
    this.projectStore.close();
    this.running = false;
    this.startedAt = undefined;
    this.processingQueue = false;
    this.runQueue.length = 0;

    this.logger.info('OrchestrationEngine stopped.');
  }

  async submitAgenda(agenda: string, channel: string, options: SubmitRunOptions = {}): Promise<string> {
    this.assertRunning();
    const project = this.createProject(agenda, channel, options.metadata);
    const run = this.createRun(project, channel, options);

    this.bus.emit('AgendaSubmitted', {
      projectId: project.id,
      agenda,
      channel,
      submittedAt: project.createdAt,
    });

    this.logger.info(`Agenda submitted — project ${project.id}: "${agenda}"`);
    return project.id;
  }

  async submitRun(agenda: string, channel: string, options: SubmitRunOptions = {}): Promise<Run> {
    const projectId = await this.submitAgenda(agenda, channel, options);
    const runs = this.projectStore.getRunsByProject(projectId);
    const run = runs[0];
    if (run === undefined) {
      throw new Error(`Run creation failed for project ${projectId}`);
    }
    return run;
  }

  getProject(projectId: string): Project | undefined {
    const project = this.projects.get(projectId) ?? this.projectStore.getProject(projectId);
    return project !== undefined ? cloneProject(project) : undefined;
  }

  getRun(runId: string): Run | undefined {
    const run = this.projectStore.getRun(runId);
    return run !== undefined ? { ...run, budget: run.budget !== undefined ? { ...run.budget } : undefined } : undefined;
  }

  getRunSummary(runId: string): RunStatusSummary | undefined {
    const run = this.projectStore.getRun(runId);
    if (run === undefined) return undefined;
    const currentStep = this.projectStore.getCurrentRunStep(runId);
    const pendingApproval = this.projectStore.getPendingApprovalForRun(runId);
    const recentEvents = this.projectStore.getRunEvents(runId, 10);
    const totalCostUsd = this.projectStore.getCostSummary(undefined, runId).totalCost;
    const actionPreview = pendingApproval?.actionBatch ?? currentStep?.actionBatch;
    return buildRunStatusSummary({ run, currentStep, pendingApproval, recentEvents, totalCostUsd, actionPreview });
  }

  listRunSummaries(): RunStatusSummary[] {
    return this.projectStore.getAllRuns().map((run) => this.getRunSummary(run.id)).filter((summary): summary is RunStatusSummary => summary !== undefined);
  }

  async approveRun(approvalId: string, approved: boolean, approvedBy?: string, comment?: string): Promise<ApprovalRequestRecord | undefined> {
    const approval = this.projectStore.resolveApprovalRequest(approvalId, {
      status: approved ? 'approved' : 'rejected',
      respondedAt: new Date(),
      approvedBy,
      comment,
    });
    if (approval === undefined) return undefined;

    const run = this.projectStore.getRun(approval.runId);
    const step = this.projectStore.getRunSteps(approval.runId).find((candidate) => candidate.id === approval.stepId);
    if (run === undefined || step === undefined) {
      return approval;
    }

    this.projectStore.appendRunEvent({
      id: nanoid(),
      runId: run.id,
      stepId: step.id,
      type: 'approval.resolved',
      message: approved ? 'Approval granted' : 'Approval rejected',
      payload: { approvalId, approved, approvedBy, comment },
      createdAt: new Date(),
    });

    if (!approved) {
      this.projectStore.updateRunStepStatus(step.id, RunStepStatus.FAILED, {
        resultSummary: comment ?? 'Approval rejected',
        completedAt: new Date(),
      });
      this.projectStore.updateRunStatus(run.id, RunStatus.FAILED, comment ?? 'Approval rejected');
      await this.notifyRunUpdate(run.id, 'Run failed because the approval request was rejected.');
      return approval;
    }

    this.projectStore.updateRunStepStatus(step.id, RunStepStatus.QUEUED, {
      completedAt: undefined,
      checkpoint: {
        ...(step.checkpoint ?? {}),
        approvalGranted: true,
        approvalId,
        approvedBy,
        approvedAt: new Date().toISOString(),
      },
      resultSummary: step.resultSummary ?? approval.summary,
    });
    this.projectStore.updateRunStatus(run.id, RunStatus.QUEUED);
    this.enqueueRun(run.id);
    await this.notifyRunUpdate(run.id, `Approval received for ${step.title}. Resuming run.`);
    void this.processQueuedRuns();
    return approval;
  }

  getStatus(): EngineStatus {
    return {
      running: this.running,
      projectCount: this.projects.size,
      runCount: this.projectStore.getAllRuns().length,
      queuedRuns: this.runQueue.length,
      agentCount: this.registry.count(),
      startedAt: this.startedAt,
    };
  }

  getEventBus(): EventBus<AigoraEvents> {
    return this.bus;
  }

  getRegistry(): AgentRegistry {
    return this.registry;
  }

  private createProject(agenda: string, channel: string, metadata?: Record<string, unknown>): Project {
    const now = new Date();
    const project: Project = {
      id: nanoid(),
      agenda,
      channel,
      phase: Phase.RESEARCH,
      status: 'active',
      agentIds: [],
      tasks: [],
      messages: [],
      createdAt: now,
      updatedAt: now,
      metadata,
    };
    this.projects.set(project.id, project);
    this.projectStore.saveProject(project);
    return project;
  }

  private createRun(project: Project, channel: string, options: SubmitRunOptions): Run {
    const run = createRunForProject(project, { ...options, source: options.source ?? RunSource.CLI });
    const steps = createDefaultStepsForRun(run);
    run.currentStepId = steps[0]?.id;
    this.projectStore.saveRun(run);
    for (const step of steps) {
      this.projectStore.saveRunStep(step);
    }
    this.projectStore.appendRunEvent({
      id: nanoid(),
      runId: run.id,
      type: 'run.created',
      message: `Run created in ${run.mode} mode`,
      payload: { projectId: project.id, source: run.source },
      createdAt: new Date(),
    });
    this.enqueueRun(run.id);
    return run;
  }

  private enqueueRun(runId: string): void {
    if (!this.runQueue.includes(runId)) {
      this.runQueue.push(runId);
    }
    const run = this.projectStore.getRun(runId);
    if (run !== undefined) {
      this.projectStore.updateRunStatus(runId, RunStatus.QUEUED);
      const current = this.projectStore.getCurrentRunStep(runId);
      if (current !== undefined && current.status === RunStepStatus.PENDING) {
        this.projectStore.updateRunStepStatus(current.id, RunStepStatus.QUEUED);
      }
    }

    if (this.running) {
      void this.processQueuedRuns();
    }
  }

  private enqueueNextStep(runId: string, completedSequence: number): void {
    const next = this.projectStore.getRunSteps(runId).find((step) => step.sequence === completedSequence + 1);
    if (next !== undefined && next.status === RunStepStatus.PENDING) {
      this.projectStore.updateRunStepStatus(next.id, RunStepStatus.QUEUED);
      const run = this.projectStore.getRun(runId);
      if (run !== undefined) {
        run.currentStepId = next.id;
        run.updatedAt = new Date();
        this.projectStore.saveRun(run);
      }
      this.enqueueRun(runId);
    } else {
      this.projectStore.updateRunStatus(runId, RunStatus.COMPLETED);
      const run = this.projectStore.getRun(runId);
      if (run !== undefined) {
        const project = this.projects.get(run.projectId) ?? this.projectStore.getProject(run.projectId);
        if (project !== undefined) {
          project.status = 'completed';
          project.completedAt = new Date();
          project.updatedAt = new Date();
          this.projects.set(project.id, project);
          this.projectStore.saveProject(project);
        }
      }
    }
  }

  private async processQueuedRuns(): Promise<void> {
    if (this.processingQueue || !this.running) return;
    this.processingQueue = true;

    try {
      while (this.runQueue.length > 0 && this.running) {
        const runId = this.runQueue.shift();
        if (runId === undefined) continue;
        await this.executeRun(runId);
      }
    } finally {
      this.processingQueue = false;
    }
  }

  private async executeRun(runId: string): Promise<void> {
    const run = this.projectStore.getRun(runId);
    if (run === undefined) return;
    if (run.status === RunStatus.WAITING_APPROVAL || run.status === RunStatus.COMPLETED || run.status === RunStatus.FAILED || run.status === RunStatus.CANCELLED) {
      return;
    }

    const step = this.projectStore.getCurrentRunStep(runId);
    if (step === undefined) {
      this.projectStore.updateRunStatus(runId, RunStatus.COMPLETED);
      await this.notifyRunUpdate(runId, 'Run completed.');
      return;
    }

    const stepStartedAt = step.startedAt ?? new Date();
    this.projectStore.updateRunStepStatus(step.id, RunStepStatus.RUNNING, { startedAt: stepStartedAt });
    run.status = RunStatus.RUNNING;
    run.currentStepId = step.id;
    run.updatedAt = new Date();
    this.projectStore.saveRun(run);

    this.projectStore.appendRunEvent({
      id: nanoid(),
      runId: run.id,
      stepId: step.id,
      type: 'step.started',
      message: `Started ${step.title}`,
      payload: { phase: step.phase, sequence: step.sequence },
      createdAt: new Date(),
    });

    let result: StepExecutionResult;
    try {
      result = await this.executeStep(run, step);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.projectStore.appendRunEvent({
        id: nanoid(),
        runId: run.id,
        stepId: step.id,
        type: 'step.failed',
        message,
        payload: { phase: step.phase },
        createdAt: new Date(),
      });
      this.projectStore.updateRunStepStatus(step.id, RunStepStatus.FAILED, {
        completedAt: new Date(),
        resultSummary: message,
      });
      this.projectStore.updateRunStatus(run.id, RunStatus.FAILED, message);
      await this.notifyRunUpdate(run.id, message);
      return;
    }
    if (result.blockedReason !== undefined) {
      this.projectStore.updateRunStepStatus(step.id, RunStepStatus.FAILED, {
        completedAt: new Date(),
        resultSummary: result.blockedReason,
      });
      this.projectStore.updateRunStatus(run.id, RunStatus.FAILED, result.blockedReason);
      await this.notifyRunUpdate(run.id, result.blockedReason);
      return;
    }

    if (result.preview !== undefined) {
      this.projectStore.updateRunStepStatus(step.id, result.approvalRequired ? RunStepStatus.WAITING_APPROVAL : RunStepStatus.RUNNING, {
        actionBatch: result.preview,
        checkpoint: result.approvalRequired
          ? {
              ...(step.checkpoint ?? {}),
              awaitingApproval: true,
              approvalRequestedAt: new Date().toISOString(),
            }
          : step.checkpoint,
        resultSummary: result.summary,
      });
    }

    const refreshedRun = this.projectStore.getRun(run.id);
    const refreshedStep = this.projectStore.getRunSteps(run.id).find((candidate) => candidate.id === step.id) ?? step;
    if (refreshedRun === undefined) return;

    if (result.approvalRequired && result.preview !== undefined) {
      const approval = createApprovalRecord(refreshedRun, refreshedStep, `Approval required for ${refreshedStep.title}`, result.preview);
      this.projectStore.saveApprovalRequest(approval);
      this.projectStore.updateRunStatus(refreshedRun.id, RunStatus.WAITING_APPROVAL);
      this.projectStore.appendRunEvent({
        id: nanoid(),
        runId: refreshedRun.id,
        stepId: refreshedStep.id,
        type: 'approval.requested',
        message: approval.summary,
        payload: { approvalId: approval.id },
        createdAt: new Date(),
      });
      await this.notifyRunUpdate(refreshedRun.id, `${refreshedStep.title} is waiting for approval.`);
      return;
    }

    this.projectStore.updateRunStepStatus(refreshedStep.id, RunStepStatus.COMPLETED, {
      completedAt: new Date(),
      resultSummary: result.summary,
      actionBatch: result.preview,
    });
    this.projectStore.appendRunEvent({
      id: nanoid(),
      runId: refreshedRun.id,
      stepId: refreshedStep.id,
      type: 'step.completed',
      message: result.summary,
      payload: { phase: refreshedStep.phase },
      createdAt: new Date(),
    });

    this.enqueueNextStep(refreshedRun.id, refreshedStep.sequence);
    const nextRun = this.projectStore.getRun(refreshedRun.id);
    if (nextRun?.status === RunStatus.COMPLETED) {
      this.projectStore.appendRunEvent({
        id: nanoid(),
        runId: refreshedRun.id,
        type: 'run.completed',
        message: 'Run completed successfully',
        createdAt: new Date(),
      });
    }

    await this.notifyRunUpdate(refreshedRun.id, result.summary);
    if (this.projectStore.getRun(refreshedRun.id)?.status === RunStatus.QUEUED) {
      void this.processQueuedRuns();
    }
  }

  private async executeStep(run: Run, step: RunStep): Promise<StepExecutionResult> {
    const project = this.projects.get(run.projectId) ?? this.projectStore.getProject(run.projectId);
    if (project === undefined) {
      return { summary: 'Project not found for run execution', approvalRequired: false, blockedReason: 'Project not found for run execution' };
    }

    if (step.actionBatch !== undefined && step.checkpoint?.['approvalGranted'] === true) {
      const executedSummary = await this.executeActionBatch(run, step, step.actionBatch);
      return {
        summary: executedSummary,
        preview: step.actionBatch,
        approvalRequired: false,
      };
    }

    const agents = this.instantiateAgentsForStep(step);
    project.agentIds = agents.map((agent) => agent.id);
    project.updatedAt = new Date();
    this.projects.set(project.id, project);
    this.projectStore.saveProject(project);

    const outputs: string[] = [];
    const envelopes = [];

    for (const agent of agents) {
      try {
        const thought = await agent.think({
          projectId: project.id,
          phase: step.phase,
          agenda: project.agenda,
          recentMessages: project.messages.slice(-20).map((message) => ({ agentId: message.agentId, content: message.content })),
          metadata: { runId: run.id, stepId: step.id, mode: run.mode },
        });
        const action = await agent.act(thought);
        outputs.push(action.output);
        envelopes.push(...(action.envelopes ?? [this.createFallbackEnvelope(action.action, action.output)]));
        project.messages.push(this.createProjectMessage(project.id, agent.id, project.channel, action.output, step.phase));

        const llmResponse = action.artifacts?.['llmResponse'];
        if (llmResponse !== undefined) {
          this.costTracker.track(agent.id, llmResponse as import('./llm-router.js').LlmResponse, project.id);
          this.projectStore.saveCostEntry({
            id: nanoid(),
            projectId: project.id,
            runId: run.id,
            agentId: agent.id,
            model: (llmResponse as import('./llm-router.js').LlmResponse).model,
            provider: (llmResponse as import('./llm-router.js').LlmResponse).provider,
            inputTokens: (llmResponse as import('./llm-router.js').LlmResponse).tokensUsed.input,
            outputTokens: (llmResponse as import('./llm-router.js').LlmResponse).tokensUsed.output,
            totalTokens: (llmResponse as import('./llm-router.js').LlmResponse).tokensUsed.total,
            cost: (llmResponse as import('./llm-router.js').LlmResponse).cost,
            recordedAt: new Date(),
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.bus.emit('ErrorOccurred', { error: new Error(message), occurredAt: new Date(), projectId: project.id, context: step.title });
        return { summary: message, approvalRequired: false, blockedReason: message };
      }
    }

    project.updatedAt = new Date();
    project.phase = step.phase;
    this.projectStore.saveProject(project);

    const preview = buildActionBatchPreview(run, step, envelopes);
    const policyDecision = this.evaluateActionBatch(step, preview);
    if (policyDecision === 'deny') {
      return {
        summary: `Blocked by policy before executing ${step.title}`,
        approvalRequired: false,
        blockedReason: `Blocked by policy before executing ${step.title}`,
      };
    }

    const totalCost = this.projectStore.getCostSummary(undefined, run.id).totalCost;
    if (run.budget?.maxCostUsd !== undefined && totalCost > run.budget.maxCostUsd) {
      return {
        summary: `Budget cap reached for ${step.title}`,
        approvalRequired: true,
        preview,
      };
    }

    const approvalRequired = policyDecision === 'require_approval' || preview.approvalRequired;
    if (approvalRequired) {
      return {
        summary: outputs.join('\n\n').slice(0, 4000),
        preview,
        approvalRequired: true,
      };
    }

    const executedSummary = await this.executeActionBatch(run, step, preview);

    return {
      summary: [outputs.join('\n\n').slice(0, 4000), executedSummary].filter((value) => value.length > 0).join('\n\n'),
      preview,
      approvalRequired: false,
    };
  }

  private instantiateAgentsForStep(step: RunStep): BaseAgent[] {
    const roles = step.assignedRoles.slice(0, 1);
    return roles.map((role) => {
      const agent = AgentFactory.create(role);
      agent.setRouter(this.llmRouter);
      agent.setTools(this.toolRegistry);
      this.registry.register({
        id: agent.id,
        name: agent.name,
        role: agent.role,
        status: agent.status,
        capabilities: agent.getCapabilities().map((name) => ({ name })),
        model: 'auto',
        registeredAt: new Date(),
      });
      return agent;
    });
  }

  private evaluateActionBatch(step: RunStep, preview: ReturnType<typeof buildActionBatchPreview>): 'allow' | 'require_approval' | 'deny' {
    if (preview.approvalRequired) {
      return 'require_approval';
    }

    for (const action of preview.actions) {
      if (action.toolName === 'code_exec' && action.toolInput?.['command'] !== undefined) {
        const validation = this.policyEngine.validate(String(action.toolInput['command']), step.assignedRoles[0] ?? AgentRole.DEVELOPER);
        if (!validation.allowed) return 'deny';
        if (validation.severity === 'warn') return 'require_approval';
      }
      if (action.permissions?.includes('fs:write') === true && step.phase === Phase.CODE) {
        return 'require_approval';
      }
    }

    return 'allow';
  }

  private createFallbackEnvelope(action: string, output: string) {
    return {
      type: 'artifact' as const,
      title: action,
      summary: output.slice(0, 280),
      risk: 'low' as const,
      payload: { content: output },
    };
  }

  private async executeActionBatch(
    run: Run,
    step: RunStep,
    preview: ReturnType<typeof buildActionBatchPreview>,
  ): Promise<string> {
    const summaries: string[] = [];

    for (const action of preview.actions) {
      if (action.type === 'tool_call' && action.toolName !== undefined) {
        const tool = this.toolRegistry.get(action.toolName);
        if (tool === undefined) {
          throw new Error(`Tool not found: ${action.toolName}`);
        }

        const toolOutput = await tool.execute(action.toolInput ?? {});
        this.projectStore.saveRuntimeArtifact({
          id: nanoid(),
          projectId: run.projectId,
          runId: run.id,
          stepId: step.id,
          name: action.title,
          type: 'tool-output',
          content: {
            toolName: action.toolName,
            output: toolOutput,
          },
          createdAt: new Date(),
        });
        this.projectStore.appendRunEvent({
          id: nanoid(),
          runId: run.id,
          stepId: step.id,
          type: 'tool.executed',
          message: `${action.toolName} executed`,
          payload: {
            toolName: action.toolName,
            success: toolOutput.success,
          },
          createdAt: new Date(),
        });
        summaries.push(`${action.toolName}: ${toolOutput.success ? 'ok' : toolOutput.error ?? 'failed'}`);
        if (!toolOutput.success) {
          throw new Error(toolOutput.error ?? `${action.toolName} failed`);
        }
        continue;
      }

      this.persistActionArtifact(run, step, action);
      summaries.push(action.summary);
    }

    this.projectStore.updateRunStepStatus(step.id, step.status, {
      checkpoint: {
        ...(step.checkpoint ?? {}),
        approvalGranted: step.checkpoint?.['approvalGranted'] === true,
        executedAt: new Date().toISOString(),
        executedActions: preview.actions.length,
      },
    });

    return summaries.join('\n');
  }

  private persistActionArtifact(run: Run, step: RunStep, action: AgentActionEnvelope): void {
    this.projectStore.saveRuntimeArtifact({
      id: nanoid(),
      projectId: run.projectId,
      runId: run.id,
      stepId: step.id,
      name: action.title,
      type: action.type,
      content: {
        summary: action.summary,
        payload: action.payload,
        permissions: action.permissions,
        filePaths: action.filePaths,
      },
      createdAt: new Date(),
    });
  }

  private createProjectMessage(projectId: string, agentId: string, channel: string, content: string, phase: Phase): Message {
    return {
      id: nanoid(),
      projectId,
      agentId,
      channel,
      content,
      phase,
      timestamp: new Date(),
    };
  }

  private attachCoreListeners(): void {
    this.bus.on('AgendaSubmitted', ({ projectId, agenda }) => {
      this.logger.info(`[AgendaSubmitted] project=${projectId} agenda="${agenda}"`);
    });

    this.bus.on('ErrorOccurred', ({ error, context, projectId }) => {
      this.logger.error(`[ErrorOccurred] project=${projectId ?? 'global'} context=${context ?? ''}: ${error.message}`);
    });
  }

  private async connectMessengers(): Promise<void> {
    for (const messengerConfig of this.config.messengers) {
      try {
        const adapter = createAdapter(messengerConfig);
        const source = messengerConfig.type === 'slack'
          ? RunSource.SLACK
          : messengerConfig.type === 'telegram'
            ? RunSource.TELEGRAM
            : RunSource.INTERNAL;

        adapter.onMessage(async (message) => {
          const auth = new MessageAuthenticator({ rejectBots: true });
          const result = auth.authenticate(message);
          if (!result.authenticated) return;

          const approvalMatch = message.text.match(/^(approve|reject)\s+([A-Za-z0-9_-]+)(?:\s+(.*))?$/i);
          if (approvalMatch !== null) {
            const [, verb, approvalId, comment] = approvalMatch;
            const approval = await this.approveRun(approvalId!, verb!.toLowerCase() === 'approve', message.userId, comment);
            if (approval !== undefined) {
              await adapter.sendMessage(message.channel, `${verb} processed for approval ${approval.id}.`, message.threadId).catch(() => undefined);
            }
            return;
          }

          const run = await this.submitRun(message.text, message.channel, {
            source,
            requestedBy: message.userId,
            threadId: message.threadId,
            mode: RunMode.REVIEW,
          });
          await adapter.sendMessage(message.channel, formatRunSummary(this.getRunSummary(run.id)!), message.threadId).catch(() => undefined);
        });

        await adapter.connect();
        this.messengers.push(adapter);
        this.messengerBySource.set(source, adapter);
      } catch (error) {
        this.logger.warn(`Failed to connect messenger ${messengerConfig.type}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async notifyRunUpdate(runId: string, fallbackMessage: string): Promise<void> {
    const summary = this.getRunSummary(runId);
    if (summary === undefined) return;
    const messenger = this.messengerBySource.get(summary.run.source);
    if (messenger === undefined) return;
    await messenger.sendMessage(summary.run.channel, formatRunSummary(summary) || fallbackMessage, summary.run.threadId).catch(() => undefined);
  }

  private restorePersistedState(): void {
    for (const project of this.projectStore.getAllProjects()) {
      this.projects.set(project.id, project);
    }

    for (const run of this.projectStore.getAllRuns()) {
      if (run.status === RunStatus.RUNNING) {
        this.projectStore.updateRunStatus(run.id, RunStatus.QUEUED);
        this.enqueueRun(run.id);
      } else if (run.status === RunStatus.QUEUED) {
        this.enqueueRun(run.id);
      }
    }
  }

  private assertRunning(): void {
    if (!this.running) {
      throw new Error('OrchestrationEngine is not running. Call start() first.');
    }
  }
}

function applyLlmConfigToEnv(config: AigoraConfig): void {
  if (config.llm.provider !== undefined) {
    process.env['LLM_PROVIDER'] = config.llm.provider;
  }
  if (config.llm.model !== undefined) {
    process.env['LLM_MODEL'] = config.llm.model;
  }
  if (config.llm.apiKey === undefined) {
    return;
  }

  switch (config.llm.provider) {
    case 'anthropic':
      process.env['ANTHROPIC_API_KEY'] ??= config.llm.apiKey;
      break;
    case 'openai':
      process.env['OPENAI_API_KEY'] ??= config.llm.apiKey;
      break;
    case 'google':
      process.env['GOOGLE_API_KEY'] ??= config.llm.apiKey;
      break;
  }
}

function cloneProject(project: Project): Project {
  return {
    ...project,
    agentIds: [...project.agentIds],
    tasks: project.tasks.map((task) => ({ ...task })),
    messages: project.messages.map((message) => ({ ...message })),
    metadata: project.metadata !== undefined ? { ...project.metadata } : undefined,
  };
}
