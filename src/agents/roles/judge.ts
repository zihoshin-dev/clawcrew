import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class JudgeAgent extends BaseAgent {
  constructor() {
    super(AgentRole.JUDGE, DEFAULT_PERSONAS[AgentRole.JUDGE]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const participantCount = context.recentMessages.length;
    return this.buildThought(
      context,
      `Deadlock arbitration for: ${context.agenda}`,
      `Evaluating ${participantCount} positions impartially. Applying merit-based criteria to render a binding verdict that unblocks the team.`,
      0.9,
      'arbitrate_deadlock',
      { phase: context.phase, positionsEvaluated: participantCount },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Arbitration verdict stub for "${thought.summary}". LLM call will be wired here.`,
      { verdict: '', rationale: '', bindingDecision: true },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'render_verdict', 'document_decision'];
  }
}
