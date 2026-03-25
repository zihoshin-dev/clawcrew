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
    const prompt = `You are an impartial judge. Evaluate ${participantCount} positions and apply merit-based criteria to render a binding verdict that unblocks the team:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}\nPositions to evaluate:\n${context.recentMessages.map((m) => m.content).join('\n')}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    const reasoning = llmResponse?.content
      ?? `Evaluating ${participantCount} positions impartially. Applying merit-based criteria to render a binding verdict that unblocks the team.`;

    return this.buildThought(
      context,
      `Deadlock arbitration for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.93 : 0.9,
      'arbitrate_deadlock',
      { phase: context.phase, positionsEvaluated: participantCount, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this impartial evaluation, produce a binding arbitration verdict with clear rationale and a decisive recommendation:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Arbitration verdict stub for "${thought.summary}".`,
      { verdict: '', rationale: '', bindingDecision: true, usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'render_verdict', 'document_decision'];
  }
}
