import type { LlmResponse } from './llm-router.js';

export interface UsageStats {
  totalTokens: number;
  totalCost: number;
  requestCount: number;
  byModel: Record<string, number>;
}

function emptyStats(): UsageStats {
  return { totalTokens: 0, totalCost: 0, requestCount: 0, byModel: {} };
}

// ---------------------------------------------------------------------------
// CostTracker
// ---------------------------------------------------------------------------

export class CostTracker {
  private readonly byAgent: Map<string, UsageStats> = new Map();
  private global: UsageStats = emptyStats();

  track(agentId: string, response: LlmResponse): void {
    const tokens = response.tokensUsed.total;
    const cost = response.cost;
    const model = response.model;

    // Update per-agent stats
    const agentStats = this.byAgent.get(agentId) ?? emptyStats();
    agentStats.totalTokens += tokens;
    agentStats.totalCost += cost;
    agentStats.requestCount += 1;
    agentStats.byModel[model] = (agentStats.byModel[model] ?? 0) + tokens;
    this.byAgent.set(agentId, agentStats);

    // Update global stats
    this.global.totalTokens += tokens;
    this.global.totalCost += cost;
    this.global.requestCount += 1;
    this.global.byModel[model] = (this.global.byModel[model] ?? 0) + tokens;
  }

  getByAgent(agentId: string): UsageStats {
    const stats = this.byAgent.get(agentId);
    if (stats === undefined) {
      return emptyStats();
    }
    return { ...stats, byModel: { ...stats.byModel } };
  }

  getTotal(): UsageStats {
    return { ...this.global, byModel: { ...this.global.byModel } };
  }

  reset(): void {
    this.byAgent.clear();
    this.global = emptyStats();
  }
}
