import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class MarketResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.MARKET_RESEARCHER, DEFAULT_PERSONAS[AgentRole.MARKET_RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a market researcher. Map the competitive landscape, size addressable markets, and identify industry inflection points for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Mapping the competitive landscape, sizing addressable markets, and identifying industry inflection points.';

    return this.buildThought(
      context,
      `Market research for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.82 : 0.77,
      'produce_market_report',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this market research analysis, produce a market report with competitor profiles, market size estimates, and key trends:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Market report stub for "${thought.summary}".`,
      { competitors: [], marketSize: null, trends: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'tam_sam_som_analysis', 'competitor_benchmarking'];
  }
}
