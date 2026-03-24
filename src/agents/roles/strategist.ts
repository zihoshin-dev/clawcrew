import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class StrategistAgent extends BaseAgent {
  constructor() {
    super(AgentRole.STRATEGIST, DEFAULT_PERSONAS[AgentRole.STRATEGIST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Strategic analysis for: ${context.agenda}`,
      'Evaluating competitive landscape, positioning options, and multi-move consequences to recommend the winning path.',
      0.78,
      'produce_strategy_report',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Strategy report stub for "${thought.summary}". LLM call will be wired here.`,
      { options: [], recommendation: null },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'competitive_positioning', 'market_analysis'];
  }
}
