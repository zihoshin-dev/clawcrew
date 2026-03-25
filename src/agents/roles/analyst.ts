import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class AnalystAgent extends BaseAgent {
  constructor() {
    super(AgentRole.ANALYST, DEFAULT_PERSONAS[AgentRole.ANALYST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a data analyst. Define success metrics, identify relevant data sources, and plan a measurement strategy for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Defining success metrics, identifying data sources, and planning measurement strategy before development begins.';

    return this.buildThought(
      context,
      `Data analysis for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.82 : 0.77,
      'define_metrics',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this analytical framework, produce an analytics report with key metrics, data sources, and actionable insights:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Analytics report stub for "${thought.summary}".`,
      { metrics: [], dataSources: [], insights: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'forecast', 'create_dashboard'];
  }
}
