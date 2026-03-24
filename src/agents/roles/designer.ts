import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DesignerAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DESIGNER, DEFAULT_PERSONAS[AgentRole.DESIGNER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `UX design for: ${context.agenda}`,
      'Mapping user journeys, identifying friction points, and ensuring the solution is accessible and intuitive.',
      0.76,
      'define_user_flow',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Design spec stub for "${thought.summary}". LLM call will be wired here.`,
      { userFlows: [], wireframes: [], accessibilityNotes: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'audit_accessibility', 'prototype'];
  }
}
