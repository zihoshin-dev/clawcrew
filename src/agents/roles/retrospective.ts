import { AgentRole } from '../../core/types.js';
import type { Task } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';
import type { ImprovementInput } from '../../orchestrator/improvement.js';

export class RetrospectiveAgent extends BaseAgent {
  constructor() {
    super(AgentRole.RETROSPECTIVE, DEFAULT_PERSONAS[AgentRole.RETROSPECTIVE]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a retrospective facilitator. Review what went well, what did not, and why. Identify systemic patterns and convert insights into measurable improvements:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Reviewing what went well, what did not, and why. Identifying systemic patterns and converting insights into measurable improvements.';

    return this.buildThought(
      context,
      `Retrospective for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.78 : 0.73,
      'facilitate_retrospective',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this retrospective analysis, produce a structured report with what went well, areas for improvement, and concrete action items:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Retrospective report stub for "${thought.summary}".`,
      { wentWell: [], improvements: [], actionItems: [], usedLLM: !!llmResponse },
    );
  }

  /**
   * Analyse completed tasks and generate improvement suggestions.
   * Groups tasks by phase and failure rate to surface actionable insights.
   */
  analyzeCompletedWork(tasks: Task[]): ImprovementInput[] {
    const completed = tasks.filter((t) => t.status === 'completed');
    const failed = tasks.filter((t) => t.status === 'failed');
    const improvements: ImprovementInput[] = [];

    if (failed.length > 0) {
      improvements.push({
        title: 'Reduce task failure rate',
        description: `${failed.length} of ${tasks.length} tasks failed. Review task definitions and agent assignments to reduce failure rate.`,
        category: 'quality',
        impact: Math.min(10, failed.length + 4),
        feasibility: 7,
        suggestedBy: this.id,
      });
    }

    // Identify phases with no completed tasks
    const completedPhases = new Set(completed.map((t) => t.phase));
    const allPhases = new Set(tasks.map((t) => t.phase));
    for (const phase of allPhases) {
      if (!completedPhases.has(phase)) {
        improvements.push({
          title: `Improve ${phase} phase completion`,
          description: `No tasks completed in the ${phase} phase. Consider adding more capable agents or refining task scoping.`,
          category: 'dx',
          impact: 6,
          feasibility: 6,
          suggestedBy: this.id,
        });
      }
    }

    // If there are many tasks with no assignee, flag it
    const unassigned = tasks.filter((t) => t.assignedTo === undefined);
    if (unassigned.length > tasks.length / 2) {
      improvements.push({
        title: 'Improve task assignment coverage',
        description: `${unassigned.length} tasks had no assigned agent. Implement auto-assignment rules.`,
        category: 'dx',
        impact: 5,
        feasibility: 8,
        suggestedBy: this.id,
      });
    }

    return improvements;
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'root_cause_analysis', 'track_improvements'];
  }
}
