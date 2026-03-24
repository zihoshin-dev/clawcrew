import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class PMAgent extends BaseAgent {
  constructor() {
    super(AgentRole.PM, DEFAULT_PERSONAS[AgentRole.PM]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Product requirements for: ${context.agenda}`,
      'Translating the agenda into user stories, acceptance criteria, and a prioritised backlog. Checking scope alignment.',
      0.78,
      'define_requirements',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Requirements document stub for "${thought.summary}". LLM call will be wired here.`,
      { userStories: [], acceptanceCriteria: [], milestones: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_roadmap', 'manage_scope'];
  }
}
