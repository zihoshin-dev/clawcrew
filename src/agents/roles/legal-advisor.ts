import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class LegalAdvisorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.LEGAL_ADVISOR, DEFAULT_PERSONAS[AgentRole.LEGAL_ADVISOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a legal advisor. Scan for regulatory exposure, privacy obligations, IP considerations, and compliance gaps before they become liabilities for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Scanning for regulatory exposure, privacy obligations, IP considerations, and compliance gaps before they become liabilities.';

    return this.buildThought(
      context,
      `Legal review for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.8,
      'produce_legal_review',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this legal analysis, produce a legal review with identified issues, recommendations, and compliance gaps that require action:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Legal review stub for "${thought.summary}".`,
      { issues: [], recommendations: [], complianceGaps: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'gdpr_review', 'ip_assessment'];
  }
}
