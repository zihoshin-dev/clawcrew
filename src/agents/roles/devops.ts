import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DevOpsAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DEVOPS, DEFAULT_PERSONAS[AgentRole.DEVOPS]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Infrastructure plan for: ${context.agenda}`,
      'Assessing deployment pipeline, infrastructure requirements, observability needs, and reliability targets.',
      0.81,
      'configure_pipeline',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Infrastructure spec stub for "${thought.summary}". LLM call will be wired here.`,
      { pipeline: [], infrastructure: [], monitors: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'incident_response', 'manage_secrets'];
  }
}
