import type { CostTracker } from '../core/cost-tracker.js';

export interface CostReport {
  totalCost: number;
  byAgent: Record<string, number>;
  byModel: Record<string, number>;
  requestCount: number;
  period: { from: Date; to: Date };
}

export class CostReporter {
  constructor(private readonly costTracker: CostTracker) {}

  generateReport(projectId?: string): CostReport {
    const stats =
      projectId !== undefined
        ? this.costTracker.getByProject(projectId)
        : this.costTracker.getTotal();

    // byAgent: map agentId → cost. CostTracker exposes getByAgent but not a
    // full list; we surface what is available from global stats.
    const byAgent: Record<string, number> = {};
    const byModel: Record<string, number> = { ...stats.byModel };

    return {
      totalCost: stats.totalCost,
      byAgent,
      byModel,
      requestCount: stats.requestCount,
      period: { from: new Date(0), to: new Date() },
    };
  }

  formatForCli(report: CostReport): string {
    const lines: string[] = [
      '=== Cost Report ===',
      `Total cost:    $${report.totalCost.toFixed(6)}`,
      `Requests:      ${report.requestCount}`,
      `Period:        ${report.period.from.toISOString()} → ${report.period.to.toISOString()}`,
    ];

    if (Object.keys(report.byModel).length > 0) {
      lines.push('\nBy model (tokens):');
      for (const [model, tokens] of Object.entries(report.byModel)) {
        lines.push(`  ${model}: ${tokens}`);
      }
    }

    if (Object.keys(report.byAgent).length > 0) {
      lines.push('\nBy agent (cost):');
      for (const [agent, cost] of Object.entries(report.byAgent)) {
        lines.push(`  ${agent}: $${cost.toFixed(6)}`);
      }
    }

    return lines.join('\n');
  }

  formatForSlack(report: CostReport): string {
    const lines: string[] = [
      '*Cost Report*',
      `• Total cost: \`$${report.totalCost.toFixed(6)}\``,
      `• Requests: \`${report.requestCount}\``,
    ];

    if (Object.keys(report.byModel).length > 0) {
      lines.push('*By model (tokens):*');
      for (const [model, tokens] of Object.entries(report.byModel)) {
        lines.push(`  • ${model}: \`${tokens}\``);
      }
    }

    return lines.join('\n');
  }

  formatForTelegram(report: CostReport): string {
    const lines: string[] = [
      '<b>Cost Report</b>',
      `Total cost: <code>$${report.totalCost.toFixed(6)}</code>`,
      `Requests: <code>${report.requestCount}</code>`,
    ];

    if (Object.keys(report.byModel).length > 0) {
      lines.push('<b>By model (tokens):</b>');
      for (const [model, tokens] of Object.entries(report.byModel)) {
        lines.push(`  ${model}: <code>${tokens}</code>`);
      }
    }

    return lines.join('\n');
  }
}
