import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DataScientistAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DATA_SCIENTIST, DEFAULT_PERSONAS[AgentRole.DATA_SCIENTIST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a data scientist. Select appropriate statistical methods and ML approaches to extract actionable insights from available data for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Selecting appropriate statistical methods and ML approaches to extract actionable insights from available data.';

    return this.buildThought(
      context,
      `Data analysis for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.86 : 0.82,
      'produce_data_analysis',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this data science analysis, produce a detailed report with insights, recommended models, and visualisation strategies:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Data analysis stub for "${thought.summary}".`,
      { insights: [], models: [], visualisations: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'machine_learning', 'statistical_modelling'];
  }
}
