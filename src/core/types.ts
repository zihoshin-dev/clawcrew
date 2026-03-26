export enum AgentRole {
  RESEARCHER = 'RESEARCHER',
  ARCHITECT = 'ARCHITECT',
  DEVELOPER = 'DEVELOPER',
  CRITIC = 'CRITIC',
  PM = 'PM',
  QA = 'QA',
  SECURITY = 'SECURITY',
  DESIGNER = 'DESIGNER',
  ANALYST = 'ANALYST',
  MEDIATOR = 'MEDIATOR',
  DEVOPS = 'DEVOPS',
  SCRUM_MASTER = 'SCRUM_MASTER',
  JUDGE = 'JUDGE',
  RETROSPECTIVE = 'RETROSPECTIVE',
  VISIONARY = 'VISIONARY',
  INNOVATOR = 'INNOVATOR',
  STRATEGIST = 'STRATEGIST',
  COLLABORATOR = 'COLLABORATOR',
  DATA_SCIENTIST = 'DATA_SCIENTIST',
  UX_RESEARCHER = 'UX_RESEARCHER',
  MARKET_RESEARCHER = 'MARKET_RESEARCHER',
  RISK_MANAGER = 'RISK_MANAGER',
  LEGAL_ADVISOR = 'LEGAL_ADVISOR',
  TECH_WRITER = 'TECH_WRITER',
}

export enum AgentStatus {
  IDLE = 'IDLE',
  THINKING = 'THINKING',
  RESPONDING = 'RESPONDING',
  WAITING = 'WAITING',
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
}

export enum Phase {
  RESEARCH = 'RESEARCH',
  PLAN = 'PLAN',
  DESIGN = 'DESIGN',
  CODE = 'CODE',
  TEST = 'TEST',
  REVIEW = 'REVIEW',
  DEPLOY = 'DEPLOY',
}

export enum RunMode {
  SOLO = 'solo',
  REVIEW = 'review',
  FULL = 'full',
}

export enum RunSource {
  CLI = 'cli',
  SLACK = 'slack',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
  INTERNAL = 'internal',
}

export enum RunStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING_APPROVAL = 'waiting_approval',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum RunStepStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING_APPROVAL = 'waiting_approval',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled',
}

export type AutonomyLevel = 'read_only' | 'review' | 'bounded' | 'full';
export type ActionEnvelopeType = 'message' | 'artifact' | 'tool_call' | 'approval_request' | 'decision' | 'finish';
export type ActionRisk = 'low' | 'medium' | 'high';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'timed_out' | 'cancelled';
export type PermissionDecision = 'allow' | 'warn' | 'require_approval' | 'deny';

export interface LlmConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MessengerConfig {
  type: 'slack' | 'telegram' | 'kakaowork';
  token: string;
  signingSecret?: string;
  botToken?: string;
  appToken?: string;
  allowedUserIds?: string[];
}

export interface AigoraConfig {
  messengers: MessengerConfig[];
  llm: LlmConfig;
  agentLlmOverrides?: Partial<Record<AgentRole, LlmConfig>>;
  maxAgentsPerProject?: number;
  decisionTimeoutMs?: number;
  deadlockTimeoutMs?: number;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface Message {
  id: string;
  projectId: string;
  agentId: string;
  channel: string;
  content: string;
  phase: Phase;
  timestamp: Date;
  replyToId?: string;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignedTo?: string;
  phase: Phase;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  result?: unknown;
}

export interface Project {
  id: string;
  agenda: string;
  channel: string;
  phase: Phase;
  status: 'active' | 'completed' | 'failed' | 'paused';
  agentIds: string[];
  tasks: Task[];
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface RunBudget {
  maxCostUsd?: number;
  maxModelCalls?: number;
  maxWriteActions?: number;
}

export interface AgentActionEnvelope {
  type: ActionEnvelopeType;
  title: string;
  summary: string;
  risk: ActionRisk;
  requiresApproval?: boolean;
  permissions?: string[];
  toolName?: string;
  toolInput?: Record<string, unknown>;
  filePaths?: string[];
  payload?: Record<string, unknown>;
}

export interface ActionBatchPreview {
  runId: string;
  stepId: string;
  summary: string;
  actions: AgentActionEnvelope[];
  approvalRequired: boolean;
  blastRadius: {
    permissions: string[];
    filePaths: string[];
    externalEffects: string[];
  };
}

export interface Run {
  id: string;
  projectId: string;
  agenda: string;
  channel: string;
  threadId?: string;
  source: RunSource;
  mode: RunMode;
  autonomy: AutonomyLevel;
  status: RunStatus;
  currentStepId?: string;
  requestedBy?: string;
  error?: string;
  budget?: RunBudget;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface RunStep {
  id: string;
  runId: string;
  key: string;
  title: string;
  phase: Phase;
  status: RunStepStatus;
  sequence: number;
  assignedRoles: AgentRole[];
  actionBatch?: ActionBatchPreview;
  checkpoint?: Record<string, unknown>;
  resultSummary?: string;
  retryCount: number;
  startedAt?: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
}

export interface RunEvent {
  id: string;
  runId: string;
  stepId?: string;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
}

export interface ApprovalRequestRecord {
  id: string;
  runId: string;
  stepId: string;
  projectId: string;
  phase: Phase;
  channel: string;
  status: ApprovalStatus;
  summary: string;
  timeoutMs: number;
  actionBatch?: ActionBatchPreview;
  requestedAt: Date;
  respondedAt?: Date;
  approvedBy?: string;
  comment?: string;
}

export interface RuntimeArtifact {
  id: string;
  runId: string;
  stepId?: string;
  projectId: string;
  name: string;
  type: string;
  content: unknown;
  createdAt: Date;
}

export interface PermissionDecisionResult {
  decision: PermissionDecision;
  reason?: string;
}

export interface SubmitRunOptions {
  mode?: RunMode;
  autonomy?: AutonomyLevel;
  source?: RunSource;
  requestedBy?: string;
  threadId?: string;
  budget?: RunBudget;
  metadata?: Record<string, unknown>;
}

export interface RunStatusSummary {
  run: Run;
  currentStep?: RunStep;
  pendingApproval?: ApprovalRequestRecord;
  recentEvents: RunEvent[];
  totalCostUsd: number;
  actionPreview?: ActionBatchPreview;
}
