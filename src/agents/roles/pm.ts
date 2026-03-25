import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class PMAgent extends BaseAgent {
  constructor() {
    super(AgentRole.PM, DEFAULT_PERSONAS[AgentRole.PM]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a product manager. Translate the following agenda into user stories, acceptance criteria, and a prioritised backlog. Check for scope alignment and business value:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Translating the agenda into user stories, acceptance criteria, and a prioritised backlog. Checking scope alignment.';

    return this.buildThought(
      context,
      `Product requirements for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.83 : 0.78,
      'define_requirements',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this product analysis, produce a requirements document with user stories, acceptance criteria, and prioritised milestones:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Requirements document stub for "${thought.summary}".`,
      { userStories: [], acceptanceCriteria: [], milestones: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_roadmap', 'manage_scope'];
  }
}
