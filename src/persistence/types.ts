import type {
  ApprovalRequestRecord,
  Project,
  Run,
  RunEvent,
  RuntimeArtifact,
  RunStatus,
  RunStep,
  RunStepStatus,
} from '../core/types.js';

export type { Project, Run, RunStep, RunEvent, ApprovalRequestRecord, RuntimeArtifact };

export interface CostEntry {
  id: string;
  projectId: string;
  runId?: string;
  agentId: string;
  model: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  recordedAt: Date;
}

export interface RuntimeCostSummary {
  totalCost: number;
  requestCount: number;
  byModel: Record<string, number>;
  byAgent: Record<string, number>;
}

export interface ProjectStore {
  saveProject(project: Project): void;
  getProject(id: string): Project | undefined;
  getAllProjects(): Project[];
  deleteProject(id: string): void;

  saveRun(run: Run): void;
  getRun(id: string): Run | undefined;
  getRunsByProject(projectId: string): Run[];
  getAllRuns(): Run[];
  updateRunStatus(id: string, status: RunStatus, error?: string): void;

  saveRunStep(step: RunStep): void;
  getRunSteps(runId: string): RunStep[];
  updateRunStepStatus(stepId: string, status: RunStepStatus, patch?: Partial<RunStep>): void;
  getCurrentRunStep(runId: string): RunStep | undefined;

  appendRunEvent(event: RunEvent): void;
  getRunEvents(runId: string, limit?: number): RunEvent[];

  saveRuntimeArtifact(artifact: RuntimeArtifact): void;
  getRuntimeArtifacts(runId: string, stepId?: string): RuntimeArtifact[];

  saveApprovalRequest(request: ApprovalRequestRecord): void;
  getApprovalRequest(id: string): ApprovalRequestRecord | undefined;
  getPendingApprovalForRun(runId: string): ApprovalRequestRecord | undefined;
  resolveApprovalRequest(id: string, patch: Pick<ApprovalRequestRecord, 'status' | 'respondedAt' | 'approvedBy' | 'comment'>): ApprovalRequestRecord | undefined;

  saveCostEntry(entry: CostEntry): void;
  getCostByProject(projectId: string): CostEntry[];
  getCostByRun(runId: string): CostEntry[];
  getTotalCost(): number;
  getCostSummary(projectId?: string, runId?: string): RuntimeCostSummary;

  close(): void;
}
