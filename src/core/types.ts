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

export interface LlmConfig {
  provider: 'anthropic' | 'openai' | 'google';
  model: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface MessengerConfig {
  type: 'slack' | 'telegram';
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
