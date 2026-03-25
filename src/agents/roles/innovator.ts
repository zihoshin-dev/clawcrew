import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class InnovatorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.INNOVATOR, DEFAULT_PERSONAS[AgentRole.INNOVATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are an innovation catalyst. Challenge assumptions and explore unconventional solution spaces to find breakthrough approaches for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Challenging assumptions and exploring unconventional solution spaces to find breakthrough approaches.';

    return this.buildThought(
      context,
      `Creative problem-solving for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.77 : 0.72,
      'produce_innovation_brief',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this innovation analysis, produce an innovation brief with creative ideas and disruption opportunities:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Innovation brief stub for "${thought.summary}".`,
      { ideas: [], disruptionOpportunities: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'design_thinking', 'lateral_thinking'];
  }
}
