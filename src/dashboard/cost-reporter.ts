import type { CostTracker } from '../core/cost-tracker.js';
import type { ProjectStore, RuntimeCostSummary } from '../persistence/types.js';

export interface CostReport {
  totalCost: number;
  byAgent: Record<string, number>;
  byModel: Record<string, number>;
  requestCount: number;
  period: { from: Date; to: Date };
}

type CostReportSource = CostTracker | Pick<ProjectStore, 'getCostSummary'>;

export class CostReporter {
  constructor(private readonly source: CostReportSource) {}

  generateReport(projectId?: string, runId?: string): CostReport {
    const summary = this.resolveSummary(projectId, runId);

    return {
      totalCost: summary.totalCost,
      byAgent: { ...summary.byAgent },
      byModel: { ...summary.byModel },
      requestCount: summary.requestCount,
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

  private resolveSummary(projectId?: string, runId?: string): RuntimeCostSummary {
    if ('getCostSummary' in this.source) {
      return this.source.getCostSummary(projectId, runId);
    }

    const stats = projectId !== undefined
      ? this.source.getByProject(projectId)
      : this.source.getTotal();

    return {
      totalCost: stats.totalCost,
      requestCount: stats.requestCount,
      byModel: { ...stats.byModel },
      byAgent: {},
    };
  }
}
