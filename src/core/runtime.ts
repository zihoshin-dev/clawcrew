import { nanoid } from 'nanoid';
import {
  AgentRole,
  RunMode,
  RunSource,
  RunStatus,
  RunStepStatus,
  type ActionBatchPreview,
  type AgentActionEnvelope,
  type ApprovalRequestRecord,
  type AutonomyLevel,
  type Project,
  type Run,
  type RunBudget,
  type RunEvent,
  type RunStatusSummary,
  type RunStep,
  type SubmitRunOptions,
  Phase,
} from './types.js';

const PRIMARY_ROLE_BY_PHASE: Record<Phase, AgentRole[]> = {
  [Phase.RESEARCH]: [AgentRole.RESEARCHER, AgentRole.ANALYST],
  [Phase.PLAN]: [AgentRole.PM, AgentRole.ARCHITECT],
  [Phase.DESIGN]: [AgentRole.ARCHITECT, AgentRole.DESIGNER],
  [Phase.CODE]: [AgentRole.DEVELOPER],
  [Phase.TEST]: [AgentRole.QA],
  [Phase.REVIEW]: [AgentRole.CRITIC],
  [Phase.DEPLOY]: [AgentRole.DEVOPS],
};

const DEFAULT_AUTONOMY_BY_MODE: Record<RunMode, AutonomyLevel> = {
  [RunMode.SOLO]: 'bounded',
  [RunMode.REVIEW]: 'review',
  [RunMode.FULL]: 'full',
};

const DEFAULT_BUDGET_BY_MODE: Record<RunMode, RunBudget> = {
  [RunMode.SOLO]: { maxCostUsd: 0.5, maxModelCalls: 12, maxWriteActions: 1 },
  [RunMode.REVIEW]: { maxCostUsd: 1, maxModelCalls: 20, maxWriteActions: 1 },
  [RunMode.FULL]: { maxCostUsd: 3, maxModelCalls: 50, maxWriteActions: 5 },
};

export function createRunForProject(project: Project, options: SubmitRunOptions = {}): Run {
  const mode = options.mode ?? RunMode.REVIEW;
  return {
    id: nanoid(),
    projectId: project.id,
    agenda: project.agenda,
    channel: project.channel,
    threadId: options.threadId,
    source: options.source ?? RunSource.CLI,
    mode,
    autonomy: options.autonomy ?? DEFAULT_AUTONOMY_BY_MODE[mode],
    status: RunStatus.QUEUED,
    requestedBy: options.requestedBy,
    budget: options.budget ?? DEFAULT_BUDGET_BY_MODE[mode],
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: options.metadata,
  };
}

export function createDefaultStepsForRun(run: Run): RunStep[] {
  const phases = run.mode === RunMode.FULL
    ? [Phase.RESEARCH, Phase.PLAN, Phase.DESIGN, Phase.CODE, Phase.TEST, Phase.REVIEW, Phase.DEPLOY]
    : [Phase.RESEARCH, Phase.PLAN, Phase.CODE, Phase.TEST, Phase.REVIEW];

  return phases.map((phase, index) => ({
    id: nanoid(),
    runId: run.id,
    key: `${phase.toLowerCase()}-${index + 1}`,
    title: buildStepTitle(phase),
    phase,
    status: index === 0 ? RunStepStatus.QUEUED : RunStepStatus.PENDING,
    sequence: index + 1,
    assignedRoles: PRIMARY_ROLE_BY_PHASE[phase],
    retryCount: 0,
  }));
}

export function buildActionBatchPreview(
  run: Run,
  step: RunStep,
  envelopes: AgentActionEnvelope[],
): ActionBatchPreview {
  const permissions = unique(
    envelopes.flatMap((envelope) => envelope.permissions ?? []),
  );
  const filePaths = unique(
    envelopes.flatMap((envelope) => envelope.filePaths ?? []),
  );
  const externalEffects = unique(
    envelopes.flatMap((envelope) => {
      if (envelope.toolName !== undefined) {
        return [`tool:${envelope.toolName}`];
      }
      return [];
    }),
  );

  const approvalRequired = envelopes.some((envelope) => envelope.requiresApproval)
    || (run.mode === RunMode.REVIEW && step.phase === Phase.CODE)
    || (run.mode === RunMode.SOLO && envelopes.some((envelope) => envelope.risk === 'high'));

  return {
    runId: run.id,
    stepId: step.id,
    summary: `${step.title} proposes ${envelopes.length} action${envelopes.length === 1 ? '' : 's'}`,
    actions: envelopes,
    approvalRequired,
    blastRadius: {
      permissions,
      filePaths,
      externalEffects,
    },
  };
}

export function createApprovalRecord(
  run: Run,
  step: RunStep,
  summary: string,
  actionBatch?: ActionBatchPreview,
  timeoutMs = 30 * 60 * 1_000,
): ApprovalRequestRecord {
  return {
    id: nanoid(),
    runId: run.id,
    stepId: step.id,
    projectId: run.projectId,
    phase: step.phase,
    channel: run.channel,
    status: 'pending',
    summary,
    timeoutMs,
    actionBatch,
    requestedAt: new Date(),
  };
}

export function buildRunStatusSummary(args: {
  run: Run;
  currentStep?: RunStep;
  pendingApproval?: ApprovalRequestRecord;
  recentEvents: RunEvent[];
  totalCostUsd: number;
  actionPreview?: ActionBatchPreview;
}): RunStatusSummary {
  return {
    run: args.run,
    currentStep: args.currentStep,
    pendingApproval: args.pendingApproval,
    recentEvents: args.recentEvents,
    totalCostUsd: args.totalCostUsd,
    actionPreview: args.actionPreview,
  };
}

export function formatRunSummary(summary: RunStatusSummary): string {
  const lines = [
    `Run ${summary.run.id}`,
    `Status: ${summary.run.status}`,
    `Mode: ${summary.run.mode}`,
    `Agenda: ${summary.run.agenda}`,
  ];

  if (summary.currentStep !== undefined) {
    lines.push(`Current step: ${summary.currentStep.title} (${summary.currentStep.phase})`);
  }
  if (summary.pendingApproval !== undefined) {
    lines.push(`Waiting approval: ${summary.pendingApproval.summary}`);
  }
  if (summary.actionPreview !== undefined) {
    lines.push(`Action preview: ${summary.actionPreview.summary}`);
  }
  lines.push(`Total cost: $${summary.totalCostUsd.toFixed(6)}`);

  return lines.join('\n');
}

function buildStepTitle(phase: Phase): string {
  switch (phase) {
    case Phase.RESEARCH:
      return 'Research the agenda';
    case Phase.PLAN:
      return 'Plan the work';
    case Phase.DESIGN:
      return 'Design the solution';
    case Phase.CODE:
      return 'Implement the solution';
    case Phase.TEST:
      return 'Validate the implementation';
    case Phase.REVIEW:
      return 'Review the outcome';
    case Phase.DEPLOY:
      return 'Prepare deployment';
  }
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}
