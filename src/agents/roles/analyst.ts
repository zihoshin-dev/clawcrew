import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class AnalystAgent extends BaseAgent {
  constructor() {
    super(AgentRole.ANALYST, DEFAULT_PERSONAS[AgentRole.ANALYST]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Data analysis for: ${context.agenda}`,
      'Defining success metrics, identifying data sources, and planning measurement strategy before development begins.',
      0.77,
      'define_metrics',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Analytics report stub for "${thought.summary}". LLM call will be wired here.`,
      { metrics: [], dataSources: [], insights: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'forecast', 'create_dashboard'];
  }
}
