import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class CollaboratorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.COLLABORATOR, DEFAULT_PERSONAS[AgentRole.COLLABORATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a collaboration facilitator. Identify connection points between team members and ideas to maximise synergy and shared ownership for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Identifying connection points between team members and ideas to maximise synergy and shared ownership.';

    return this.buildThought(
      context,
      `Collaboration facilitation for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.8,
      'produce_collaboration_plan',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this collaboration analysis, produce a collaboration plan identifying synergies and concrete action items for cross-functional alignment:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Collaboration plan stub for "${thought.summary}".`,
      { synergies: [], actionItems: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'cross_functional_alignment', 'knowledge_sharing'];
  }
}
