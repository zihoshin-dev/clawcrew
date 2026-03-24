import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class CriticAgent extends BaseAgent {
  constructor() {
    super(AgentRole.CRITIC, DEFAULT_PERSONAS[AgentRole.CRITIC]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Critical analysis of: ${context.agenda}`,
      'Stress-testing proposals: identifying hidden assumptions, edge cases, failure modes, and unintended consequences.',
      0.85,
      'critique_proposal',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Critique report stub for "${thought.summary}". LLM call will be wired here.`,
      { risks: [], assumptions: [], edgeCases: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'produce_risk_register', 'enumerate_edge_cases'];
  }
}
