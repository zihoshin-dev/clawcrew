import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class MediatorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.MEDIATOR, DEFAULT_PERSONAS[AgentRole.MEDIATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const divergentMessages = context.recentMessages.length;
    return this.buildThought(
      context,
      `Mediation for: ${context.agenda}`,
      `Analysing ${divergentMessages} recent messages for conflicting positions. Identifying the shared goal beneath competing viewpoints.`,
      0.72,
      'facilitate_discussion',
      { phase: context.phase, messageCount: divergentMessages },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Mediation summary stub for "${thought.summary}". LLM call will be wired here.`,
      { positions: [], commonGround: '', proposedPath: '' },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'build_consensus', 'propose_compromise'];
  }
}
