import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class CriticAgent extends BaseAgent {
  constructor() {
    super(AgentRole.CRITIC, DEFAULT_PERSONAS[AgentRole.CRITIC]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a critical analyst. Stress-test the following proposal by identifying hidden assumptions, edge cases, failure modes, and unintended consequences:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Stress-testing proposals: identifying hidden assumptions, edge cases, failure modes, and unintended consequences.';

    return this.buildThought(
      context,
      `Critical analysis of: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.88 : 0.85,
      'critique_proposal',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this critical analysis, produce a structured critique report listing risks, assumptions, and edge cases with severity ratings:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');
    const output = llmResponse?.content ?? `Critique report stub for "${thought.summary}".`;

    return this.buildResult(
      thought.suggestedAction,
      output,
      { risks: [], assumptions: [], edgeCases: [], usedLLM: !!llmResponse, llmResponse },
      [
        {
          type: 'decision',
          title: 'Critique report',
          summary: 'Review the current proposal and capture risks and edge cases.',
          risk: 'medium',
          payload: {
            artifactType: 'critique-report',
            content: output,
          },
        },
      ],
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'produce_risk_register', 'enumerate_edge_cases'];
  }
}
