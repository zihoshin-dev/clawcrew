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
// BudgetCap types
// ---------------------------------------------------------------------------

export interface BudgetConfig {
  perProject?: number;
  global?: number;
  warningThreshold?: number; // 0–1, default 0.8
}

export class BudgetExceededError extends Error {
  constructor(
    public readonly scope: 'global' | 'project',
    public readonly projectId: string | undefined,
    public readonly spent: number,
    public readonly limit: number,
  ) {
    super(
      `Budget exceeded for ${scope === 'project' ? `project ${projectId}` : 'global'}: spent $${spent.toFixed(4)} / limit $${limit.toFixed(4)}`,
    );
    this.name = 'BudgetExceededError';
  }
}

// ---------------------------------------------------------------------------
// CostTracker
// ---------------------------------------------------------------------------

export class CostTracker {
  private readonly byAgent: Map<string, UsageStats> = new Map();
  private readonly byProject: Map<string, UsageStats> = new Map();
  private global: UsageStats = emptyStats();

  // Budget state
  private budgetConfig: BudgetConfig = {};
  private warningEmittedGlobal = false;
  private readonly warningEmittedProject: Set<string> = new Set();

  // Event callback hooks — set by engine or callers
  onBudgetWarning?: (payload: { scope: 'global' | 'project'; projectId?: string; spent: number; limit: number; ratio: number }) => void;

  // ---------------------------------------------------------------------------
  // Budget API
  // ---------------------------------------------------------------------------

  setBudget(config: BudgetConfig): void {
    this.budgetConfig = { ...config };
    this.warningEmittedGlobal = false;
    this.warningEmittedProject.clear();
  }

  checkBudget(projectId?: string): { ok: boolean; ratio: number; spent: number; limit: number | undefined } {
    if (projectId !== undefined) {
      const limit = this.budgetConfig.perProject;
      if (limit === undefined) return { ok: true, ratio: 0, spent: 0, limit: undefined };
      const spent = (this.byProject.get(projectId) ?? emptyStats()).totalCost;
      return { ok: spent <= limit, ratio: spent / limit, spent, limit };
    }
    const limit = this.budgetConfig.global;
    if (limit === undefined) return { ok: true, ratio: 0, spent: 0, limit: undefined };
    const spent = this.global.totalCost;
    return { ok: spent <= limit, ratio: spent / limit, spent, limit };
  }

  isOverBudget(projectId?: string): boolean {
    return !this.checkBudget(projectId).ok;
  }

  // ---------------------------------------------------------------------------
  // Core track() — projectId is optional (backward compatible)
  // ---------------------------------------------------------------------------

  track(agentId: string, response: LlmResponse, projectId?: string): void {
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

    // Update per-project stats
    if (projectId !== undefined) {
      const projStats = this.byProject.get(projectId) ?? emptyStats();
      projStats.totalTokens += tokens;
      projStats.totalCost += cost;
      projStats.requestCount += 1;
      projStats.byModel[model] = (projStats.byModel[model] ?? 0) + tokens;
      this.byProject.set(projectId, projStats);
    }

    // Update global stats
    this.global.totalTokens += tokens;
    this.global.totalCost += cost;
    this.global.requestCount += 1;
    this.global.byModel[model] = (this.global.byModel[model] ?? 0) + tokens;

    // Budget checks
    this._checkBudgetAfterTrack(projectId);
  }

  private _checkBudgetAfterTrack(projectId?: string): void {
    const threshold = this.budgetConfig.warningThreshold ?? 0.8;

    // Global budget
    if (this.budgetConfig.global !== undefined) {
      const globalLimit = this.budgetConfig.global;
      const globalSpent = this.global.totalCost;
      const globalRatio = globalSpent / globalLimit;

      if (globalRatio >= 1) {
        throw new BudgetExceededError('global', undefined, globalSpent, globalLimit);
      }
      if (globalRatio >= threshold && !this.warningEmittedGlobal) {
        this.warningEmittedGlobal = true;
        this.onBudgetWarning?.({
          scope: 'global',
          spent: globalSpent,
          limit: globalLimit,
          ratio: globalRatio,
        });
      }
    }

    // Per-project budget
    if (projectId !== undefined && this.budgetConfig.perProject !== undefined) {
      const projLimit = this.budgetConfig.perProject;
      const projSpent = (this.byProject.get(projectId) ?? emptyStats()).totalCost;
      const projRatio = projSpent / projLimit;

      if (projRatio >= 1) {
        throw new BudgetExceededError('project', projectId, projSpent, projLimit);
      }
      if (projRatio >= threshold && !this.warningEmittedProject.has(projectId)) {
        this.warningEmittedProject.add(projectId);
        this.onBudgetWarning?.({
          scope: 'project',
          projectId,
          spent: projSpent,
          limit: projLimit,
          ratio: projRatio,
        });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Existing read API
  // ---------------------------------------------------------------------------

  getByAgent(agentId: string): UsageStats {
    const stats = this.byAgent.get(agentId);
    if (stats === undefined) {
      return emptyStats();
    }
    return { ...stats, byModel: { ...stats.byModel } };
  }

  getByProject(projectId: string): UsageStats {
    const stats = this.byProject.get(projectId);
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
    this.byProject.clear();
    this.global = emptyStats();
    this.warningEmittedGlobal = false;
    this.warningEmittedProject.clear();
  }
}
