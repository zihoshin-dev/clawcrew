import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DataScientistAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DATA_SCIENTIST, DEFAULT_PERSONAS[AgentRole.DATA_SCIENTIST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Data analysis for: ${context.agenda}`,
      'Selecting appropriate statistical methods and ML approaches to extract actionable insights from available data.',
      0.82,
      'produce_data_analysis',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Data analysis stub for "${thought.summary}". LLM call will be wired here.`,
      { insights: [], models: [], visualisations: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'machine_learning', 'statistical_modelling'];
  }
}
