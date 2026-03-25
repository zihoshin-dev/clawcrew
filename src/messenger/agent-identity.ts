import { AgentRole } from '../core/types.js';

export interface AgentIdentity {
  username: string;
  iconEmoji: string;
}

const AGENT_IDENTITIES: Record<AgentRole, AgentIdentity> = {
  [AgentRole.RESEARCHER]: { username: 'Researcher', iconEmoji: ':microscope:' },
  [AgentRole.ARCHITECT]: { username: 'Architect', iconEmoji: ':classical_building:' },
  [AgentRole.DEVELOPER]: { username: 'Developer', iconEmoji: ':computer:' },
  [AgentRole.CRITIC]: { username: 'Critic', iconEmoji: ':mag:' },
  [AgentRole.PM]: { username: 'PM', iconEmoji: ':clipboard:' },
  [AgentRole.QA]: { username: 'QA Engineer', iconEmoji: ':white_check_mark:' },
  [AgentRole.SECURITY]: { username: 'Security', iconEmoji: ':shield:' },
  [AgentRole.DESIGNER]: { username: 'Designer', iconEmoji: ':art:' },
  [AgentRole.ANALYST]: { username: 'Analyst', iconEmoji: ':bar_chart:' },
  [AgentRole.MEDIATOR]: { username: 'Mediator', iconEmoji: ':handshake:' },
  [AgentRole.DEVOPS]: { username: 'DevOps', iconEmoji: ':rocket:' },
  [AgentRole.SCRUM_MASTER]: { username: 'Scrum Master', iconEmoji: ':repeat:' },
  [AgentRole.JUDGE]: { username: 'Judge', iconEmoji: ':scales:' },
  [AgentRole.RETROSPECTIVE]: { username: 'Retrospective', iconEmoji: ':mirror:' },
  [AgentRole.VISIONARY]: { username: 'Visionary', iconEmoji: ':crystal_ball:' },
  [AgentRole.INNOVATOR]: { username: 'Innovator', iconEmoji: ':bulb:' },
  [AgentRole.STRATEGIST]: { username: 'Strategist', iconEmoji: ':chess_pawn:' },
  [AgentRole.COLLABORATOR]: { username: 'Collaborator', iconEmoji: ':people_holding_hands:' },
  [AgentRole.DATA_SCIENTIST]: { username: 'Data Scientist', iconEmoji: ':dna:' },
  [AgentRole.UX_RESEARCHER]: { username: 'UX Researcher', iconEmoji: ':busts_in_silhouette:' },
  [AgentRole.MARKET_RESEARCHER]: { username: 'Market Researcher', iconEmoji: ':world_map:' },
  [AgentRole.RISK_MANAGER]: { username: 'Risk Manager', iconEmoji: ':warning:' },
  [AgentRole.LEGAL_ADVISOR]: { username: 'Legal Advisor', iconEmoji: ':balance_scale:' },
  [AgentRole.TECH_WRITER]: { username: 'Tech Writer', iconEmoji: ':memo:' },
};

export function getAgentIdentity(role: AgentRole): AgentIdentity {
  const identity = AGENT_IDENTITIES[role];
  return identity;
}

export function getAllIdentities(): Record<AgentRole, AgentIdentity> {
  return { ...AGENT_IDENTITIES };
}
