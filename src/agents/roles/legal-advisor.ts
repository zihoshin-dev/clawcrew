import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class LegalAdvisorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.LEGAL_ADVISOR, DEFAULT_PERSONAS[AgentRole.LEGAL_ADVISOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Legal review for: ${context.agenda}`,
      'Scanning for regulatory exposure, privacy obligations, IP considerations, and compliance gaps before they become liabilities.',
      0.8,
      'produce_legal_review',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Legal review stub for "${thought.summary}". LLM call will be wired here.`,
      { issues: [], recommendations: [], complianceGaps: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'gdpr_review', 'ip_assessment'];
  }
}
