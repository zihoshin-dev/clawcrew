import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.RESEARCHER, DEFAULT_PERSONAS[AgentRole.RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Research analysis for: ${context.agenda}`,
      'Identifying key information sources, knowledge gaps, and prior art relevant to the agenda.',
      0.75,
      'produce_research_report',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Research report stub for "${thought.summary}". LLM call will be wired here.`,
      { sources: [], gaps: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'competitive_analysis', 'trend_identification'];
  }
}
