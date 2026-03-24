import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class CollaboratorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.COLLABORATOR, DEFAULT_PERSONAS[AgentRole.COLLABORATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Collaboration facilitation for: ${context.agenda}`,
      'Identifying connection points between team members and ideas to maximise synergy and shared ownership.',
      0.8,
      'produce_collaboration_plan',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Collaboration plan stub for "${thought.summary}". LLM call will be wired here.`,
      { synergies: [], actionItems: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'cross_functional_alignment', 'knowledge_sharing'];
  }
}
