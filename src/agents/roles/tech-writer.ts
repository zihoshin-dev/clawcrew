import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class TechWriterAgent extends BaseAgent {
  constructor() {
    super(AgentRole.TECH_WRITER, DEFAULT_PERSONAS[AgentRole.TECH_WRITER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a technical writer. Identify the audience, information architecture, and coverage gaps to produce documentation that actually gets used for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Identifying audience, information architecture, and coverage gaps to produce documentation that actually gets used.';

    return this.buildThought(
      context,
      `Documentation planning for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.87 : 0.83,
      'produce_documentation',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this documentation plan, produce a structured documentation outline with sections and audience profiles:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Documentation stub for "${thought.summary}".`,
      { sections: [], audienceProfiles: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'api_documentation', 'tutorial_authoring'];
  }
}
