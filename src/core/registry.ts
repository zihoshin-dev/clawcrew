import { AgentRole, AgentStatus } from './types.js';

export { AgentRole, AgentStatus };

export interface AgentCapability {
  name: string;
  description?: string;
}

export interface AgentInfo {
  id: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  capabilities: AgentCapability[];
  model: string;
  registeredAt: Date;
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// AgentRegistry — singleton
// ---------------------------------------------------------------------------

export class AgentRegistry {
  private static instance: AgentRegistry | undefined;
  private readonly agents: Map<string, AgentInfo> = new Map();

  private constructor() {}

  static getInstance(): AgentRegistry {
    if (AgentRegistry.instance === undefined) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /** Reset the singleton — useful for tests. */
  static reset(): void {
    AgentRegistry.instance = undefined;
  }

  register(agent: AgentInfo): void {
    if (this.agents.has(agent.id)) {
      throw new Error(`Agent with id '${agent.id}' is already registered.`);
    }
    this.agents.set(agent.id, { ...agent });
  }

  unregister(agentId: string): void {
    if (!this.agents.has(agentId)) {
      throw new Error(`Agent with id '${agentId}' is not registered.`);
    }
    this.agents.delete(agentId);
  }

  getById(id: string): AgentInfo | undefined {
    const agent = this.agents.get(id);
    return agent !== undefined ? { ...agent } : undefined;
  }

  getByRole(role: AgentRole): AgentInfo[] {
    return Array.from(this.agents.values())
      .filter((a) => a.role === role)
      .map((a) => ({ ...a }));
  }

  getAll(): AgentInfo[] {
    return Array.from(this.agents.values()).map((a) => ({ ...a }));
  }

  updateStatus(agentId: string, status: AgentStatus): void {
    const agent = this.agents.get(agentId);
    if (agent === undefined) {
      throw new Error(`Agent with id '${agentId}' is not registered.`);
    }
    agent.status = status;
  }

  count(): number {
    return this.agents.size;
  }
}
