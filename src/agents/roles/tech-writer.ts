import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class TechWriterAgent extends BaseAgent {
  constructor() {
    super(AgentRole.TECH_WRITER, DEFAULT_PERSONAS[AgentRole.TECH_WRITER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Documentation planning for: ${context.agenda}`,
      'Identifying audience, information architecture, and coverage gaps to produce documentation that actually gets used.',
      0.83,
      'produce_documentation',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Documentation stub for "${thought.summary}". LLM call will be wired here.`,
      { sections: [], audienceProfiles: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'api_documentation', 'tutorial_authoring'];
  }
}
