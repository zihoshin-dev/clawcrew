import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class VisionaryAgent extends BaseAgent {
  constructor() {
    super(AgentRole.VISIONARY, DEFAULT_PERSONAS[AgentRole.VISIONARY]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Future vision for: ${context.agenda}`,
      'Scanning weak signals, emerging trends, and second-order effects to envision the future state.',
      0.7,
      'produce_vision_statement',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Vision statement stub for "${thought.summary}". LLM call will be wired here.`,
      { trends: [], scenarios: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'trend_forecasting', 'scenario_planning'];
  }
}
