import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class VisionaryAgent extends BaseAgent {
  constructor() {
    super(AgentRole.VISIONARY, DEFAULT_PERSONAS[AgentRole.VISIONARY]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a visionary thinker. Scan weak signals, emerging trends, and second-order effects to envision the future state for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Scanning weak signals, emerging trends, and second-order effects to envision the future state.';

    return this.buildThought(
      context,
      `Future vision for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.75 : 0.7,
      'produce_vision_statement',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this future-oriented analysis, produce a compelling vision statement with key trends and plausible future scenarios:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Vision statement stub for "${thought.summary}".`,
      { trends: [], scenarios: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'trend_forecasting', 'scenario_planning'];
  }
}
