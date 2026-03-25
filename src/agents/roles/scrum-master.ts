import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ScrumMasterAgent extends BaseAgent {
  constructor() {
    super(AgentRole.SCRUM_MASTER, DEFAULT_PERSONAS[AgentRole.SCRUM_MASTER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a Scrum Master. Review team velocity, identify blockers, and plan agile ceremonies for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'low');

    const reasoning = llmResponse?.content
      ?? 'Reviewing team velocity, identifying blockers, and ensuring agile ceremonies stay purposeful and time-boxed.';

    return this.buildThought(
      context,
      `Sprint facilitation for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.79 : 0.74,
      'plan_sprint',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this sprint analysis, produce a sprint plan with a clear sprint goal, task breakdown, and identified impediments:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'low');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Sprint plan stub for "${thought.summary}".`,
      { sprintGoal: '', tasks: [], impediments: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'remove_impediment', 'track_velocity'];
  }
}
