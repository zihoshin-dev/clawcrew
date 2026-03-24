import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.RESEARCHER, DEFAULT_PERSONAS[AgentRole.RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `Analyze the following agenda and identify key research areas, knowledge gaps, and prior art:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Identifying key information sources, knowledge gaps, and prior art relevant to the agenda.';

    return this.buildThought(
      context,
      `Research analysis for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.75,
      'produce_research_report',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this research analysis, produce a structured research report:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Research report for "${thought.summary}".`,
      { sources: [], gaps: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'competitive_analysis', 'trend_identification'];
  }
}
