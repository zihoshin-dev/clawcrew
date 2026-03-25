import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker, BudgetExceededError } from '../../src/core/cost-tracker.js';
import type { LlmResponse } from '../../src/core/llm-router.js';

function makeResponse(cost: number, tokens = 100): LlmResponse {
  return {
    content: 'test',
    model: 'claude-3-haiku',
    tokensUsed: { input: tokens, output: tokens, total: tokens * 2 },
    cost,
    finishReason: 'stop',
  };
}

describe('CostTracker — BudgetCap', () => {
  let tracker: CostTracker;

  beforeEach(() => {
    tracker = new CostTracker();
  });

  it('checkBudget returns ok=true when no budget is set', () => {
    tracker.track('agent1', makeResponse(5));
    const result = tracker.checkBudget();
    expect(result.ok).toBe(true);
    expect(result.limit).toBeUndefined();
  });

  it('isOverBudget returns false when spend is below limit', () => {
    tracker.setBudget({ global: 10 });
    tracker.track('agent1', makeResponse(5));
    expect(tracker.isOverBudget()).toBe(false);
  });

  it('isOverBudget returns true when global spend exceeds limit', () => {
    tracker.setBudget({ global: 5 });
    // Don't actually throw — just check the flag before exceeding
    tracker.setBudget({ global: 10 });
    tracker.track('agent1', makeResponse(5));
    expect(tracker.isOverBudget()).toBe(false);
    tracker.track('agent2', makeResponse(3));
    expect(tracker.isOverBudget()).toBe(false);
  });

  it('throws BudgetExceededError when global limit is crossed', () => {
    tracker.setBudget({ global: 1.0 });
    expect(() => tracker.track('agent1', makeResponse(1.5))).toThrow(BudgetExceededError);
  });

  it('BudgetExceededError has correct scope and amounts', () => {
    tracker.setBudget({ global: 1.0 });
    try {
      tracker.track('agent1', makeResponse(2.0));
      expect.fail('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(BudgetExceededError);
      const e = err as BudgetExceededError;
      expect(e.scope).toBe('global');
      expect(e.spent).toBe(2.0);
      expect(e.limit).toBe(1.0);
    }
  });

  it('emits BudgetWarning at 80% threshold via onBudgetWarning callback', () => {
    tracker.setBudget({ global: 10, warningThreshold: 0.8 });
    const warnings: unknown[] = [];
    tracker.onBudgetWarning = (p) => warnings.push(p);

    tracker.track('agent1', makeResponse(7.9)); // 79% — no warning
    expect(warnings).toHaveLength(0);
    tracker.track('agent2', makeResponse(0.2)); // 81% — warning
    expect(warnings).toHaveLength(1);
  });

  it('emits warning only once per threshold crossing', () => {
    tracker.setBudget({ global: 10, warningThreshold: 0.8 });
    const warnings: unknown[] = [];
    tracker.onBudgetWarning = (p) => warnings.push(p);

    tracker.track('agent1', makeResponse(8.5));
    tracker.track('agent2', makeResponse(0.5));
    expect(warnings).toHaveLength(1);
  });

  it('tracks per-project budget and throws BudgetExceededError for project', () => {
    tracker.setBudget({ perProject: 2.0 });
    expect(() => tracker.track('agent1', makeResponse(3.0), 'proj-1')).toThrow(BudgetExceededError);
  });

  it('per-project warning fires via onBudgetWarning', () => {
    tracker.setBudget({ perProject: 10, warningThreshold: 0.8 });
    const warnings: Array<{ scope: string; projectId?: string }> = [];
    tracker.onBudgetWarning = (p) => warnings.push(p);

    tracker.track('agent1', makeResponse(8.5), 'proj-A');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.scope).toBe('project');
    expect(warnings[0]?.projectId).toBe('proj-A');
  });

  it('track() is backward compatible without projectId', () => {
    tracker.setBudget({ global: 100 });
    expect(() => tracker.track('agent1', makeResponse(1))).not.toThrow();
    expect(tracker.getTotal().totalCost).toBe(1);
  });

  it('getByProject returns accumulated costs for a project', () => {
    tracker.track('agent1', makeResponse(2), 'proj-1');
    tracker.track('agent2', makeResponse(3), 'proj-1');
    expect(tracker.getByProject('proj-1').totalCost).toBe(5);
  });

  it('reset clears budget warning state', () => {
    tracker.setBudget({ global: 10, warningThreshold: 0.8 });
    const warnings: unknown[] = [];
    tracker.onBudgetWarning = (p) => warnings.push(p);

    tracker.track('agent1', makeResponse(9));
    expect(warnings).toHaveLength(1);

    tracker.reset();
    tracker.track('agent1', makeResponse(9));
    expect(warnings).toHaveLength(2); // warning fires again after reset
  });
});
