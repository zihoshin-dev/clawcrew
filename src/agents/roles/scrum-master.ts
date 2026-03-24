import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ScrumMasterAgent extends BaseAgent {
  constructor() {
    super(AgentRole.SCRUM_MASTER, DEFAULT_PERSONAS[AgentRole.SCRUM_MASTER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Sprint facilitation for: ${context.agenda}`,
      'Reviewing team velocity, identifying blockers, and ensuring agile ceremonies stay purposeful and time-boxed.',
      0.74,
      'plan_sprint',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Sprint plan stub for "${thought.summary}". LLM call will be wired here.`,
      { sprintGoal: '', tasks: [], impediments: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'remove_impediment', 'track_velocity'];
  }
}
