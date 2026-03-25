import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class QAAgent extends BaseAgent {
  constructor() {
    super(AgentRole.QA, DEFAULT_PERSONAS[AgentRole.QA]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a QA engineer. Define acceptance criteria, test scenarios, edge cases, and automation strategy for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Defining acceptance criteria, test scenarios, edge cases, and automation strategy before implementation begins.';

    return this.buildThought(
      context,
      `Test strategy for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.86 : 0.82,
      'write_test_plan',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this test strategy, produce a detailed test plan with concrete test cases, automation targets, and quality gates:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Test plan stub for "${thought.summary}".`,
      { testCases: [], automationTargets: [], qualityGates: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'approve_release', 'run_regression'];
  }
}
