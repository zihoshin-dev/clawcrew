import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class MarketResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.MARKET_RESEARCHER, DEFAULT_PERSONAS[AgentRole.MARKET_RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Market research for: ${context.agenda}`,
      'Mapping the competitive landscape, sizing addressable markets, and identifying industry inflection points.',
      0.77,
      'produce_market_report',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Market report stub for "${thought.summary}". LLM call will be wired here.`,
      { competitors: [], marketSize: null, trends: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'tam_sam_som_analysis', 'competitor_benchmarking'];
  }
}
