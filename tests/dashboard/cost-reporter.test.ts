import { describe, it, expect, beforeEach } from 'vitest';
import { CostTracker } from '../../src/core/cost-tracker.js';
import { CostReporter } from '../../src/dashboard/cost-reporter.js';
import type { LlmResponse } from '../../src/core/llm-router.js';

function makeResponse(cost: number, model = 'claude-haiku', tokens = 100): LlmResponse {
  return {
    content: 'test',
    model,
    provider: 'anthropic',
    tokensUsed: { input: tokens, output: tokens, total: tokens * 2 },
    cost,
  };
}

describe('CostReporter', () => {
  let tracker: CostTracker;
  let reporter: CostReporter;

  beforeEach(() => {
    tracker = new CostTracker();
    reporter = new CostReporter(tracker);
  });

  it('generateReport returns zero cost when no usage tracked', () => {
    const report = reporter.generateReport();
    expect(report.totalCost).toBe(0);
    expect(report.requestCount).toBe(0);
  });

  it('generateReport reflects tracked costs', () => {
    tracker.track('agent-1', makeResponse(0.05));
    tracker.track('agent-2', makeResponse(0.10));
    const report = reporter.generateReport();
    expect(report.totalCost).toBeCloseTo(0.15);
    expect(report.requestCount).toBe(2);
  });

  it('generateReport for specific project reflects only that project costs', () => {
    tracker.track('agent-1', makeResponse(0.05), 'proj-A');
    tracker.track('agent-2', makeResponse(0.10), 'proj-B');
    const report = reporter.generateReport('proj-A');
    expect(report.totalCost).toBeCloseTo(0.05);
  });

  it('generateReport includes byModel breakdown', () => {
    tracker.track('agent-1', makeResponse(0.05, 'claude-haiku'));
    tracker.track('agent-2', makeResponse(0.10, 'gpt-4o'));
    const report = reporter.generateReport();
    expect(report.byModel['claude-haiku']).toBeDefined();
    expect(report.byModel['gpt-4o']).toBeDefined();
  });

  it('formatForCli includes total cost and request count', () => {
    tracker.track('agent-1', makeResponse(0.01));
    const report = reporter.generateReport();
    const output = reporter.formatForCli(report);
    expect(output).toContain('Total cost');
    expect(output).toContain('Requests');
  });

  it('formatForSlack uses mrkdwn bold markers', () => {
    const report = reporter.generateReport();
    const output = reporter.formatForSlack(report);
    expect(output).toContain('*Cost Report*');
  });

  it('formatForTelegram uses HTML tags', () => {
    const report = reporter.generateReport();
    const output = reporter.formatForTelegram(report);
    expect(output).toContain('<b>Cost Report</b>');
    expect(output).toContain('<code>');
  });
});
