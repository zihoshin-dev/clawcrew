import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DeveloperAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DEVELOPER, DEFAULT_PERSONAS[AgentRole.DEVELOPER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Implementation plan for: ${context.agenda}`,
      'Breaking the task into implementable units, identifying test cases, and flagging ambiguous requirements.',
      0.8,
      'write_code',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Implementation stub for "${thought.summary}". LLM call will be wired here.`,
      { files: [], testFiles: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_pull_request', 'code_review'];
  }
}
