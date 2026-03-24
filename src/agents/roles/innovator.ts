import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class InnovatorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.INNOVATOR, DEFAULT_PERSONAS[AgentRole.INNOVATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Creative problem-solving for: ${context.agenda}`,
      'Challenging assumptions and exploring unconventional solution spaces to find breakthrough approaches.',
      0.72,
      'produce_innovation_brief',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Innovation brief stub for "${thought.summary}". LLM call will be wired here.`,
      { ideas: [], disruptionOpportunities: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'design_thinking', 'lateral_thinking'];
  }
}
