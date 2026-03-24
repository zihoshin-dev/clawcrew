import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class RiskManagerAgent extends BaseAgent {
  constructor() {
    super(AgentRole.RISK_MANAGER, DEFAULT_PERSONAS[AgentRole.RISK_MANAGER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Risk assessment for: ${context.agenda}`,
      'Cataloguing potential failure modes, assessing likelihood and impact, and designing contingency mitigations.',
      0.85,
      'produce_risk_register',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Risk register stub for "${thought.summary}". LLM call will be wired here.`,
      { risks: [], mitigations: [], contingencies: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'red_teaming', 'contingency_planning'];
  }
}
