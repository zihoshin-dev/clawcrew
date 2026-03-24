import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class QAAgent extends BaseAgent {
  constructor() {
    super(AgentRole.QA, DEFAULT_PERSONAS[AgentRole.QA]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Test strategy for: ${context.agenda}`,
      'Defining acceptance criteria, test scenarios, edge cases, and automation strategy before implementation begins.',
      0.82,
      'write_test_plan',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Test plan stub for "${thought.summary}". LLM call will be wired here.`,
      { testCases: [], automationTargets: [], qualityGates: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'approve_release', 'run_regression'];
  }
}
