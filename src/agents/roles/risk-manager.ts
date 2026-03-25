import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class RiskManagerAgent extends BaseAgent {
  constructor() {
    super(AgentRole.RISK_MANAGER, DEFAULT_PERSONAS[AgentRole.RISK_MANAGER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a risk manager. Catalogue potential failure modes, assess likelihood and impact, and design contingency mitigations for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Cataloguing potential failure modes, assessing likelihood and impact, and designing contingency mitigations.';

    return this.buildThought(
      context,
      `Risk assessment for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.88 : 0.85,
      'produce_risk_register',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this risk analysis, produce a risk register with identified risks, mitigations, and contingency plans ranked by severity:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Risk register stub for "${thought.summary}".`,
      { risks: [], mitigations: [], contingencies: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'red_teaming', 'contingency_planning'];
  }
}
