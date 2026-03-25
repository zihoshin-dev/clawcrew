import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class StrategistAgent extends BaseAgent {
  constructor() {
    super(AgentRole.STRATEGIST, DEFAULT_PERSONAS[AgentRole.STRATEGIST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a business strategist. Evaluate the competitive landscape, positioning options, and multi-move consequences to recommend the winning path for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Evaluating competitive landscape, positioning options, and multi-move consequences to recommend the winning path.';

    return this.buildThought(
      context,
      `Strategic analysis for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.83 : 0.78,
      'produce_strategy_report',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this strategic analysis, produce a strategy report with evaluated options and a clear recommendation:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Strategy report stub for "${thought.summary}".`,
      { options: [], recommendation: null, usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'competitive_positioning', 'market_analysis'];
  }
}
