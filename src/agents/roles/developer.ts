import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DeveloperAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DEVELOPER, DEFAULT_PERSONAS[AgentRole.DEVELOPER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a senior software developer. Break down the following agenda into implementable units, identify test cases, and flag any ambiguous requirements:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Breaking the task into implementable units, identifying test cases, and flagging ambiguous requirements.';

    return this.buildThought(
      context,
      `Implementation plan for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.8,
      'write_code',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this implementation plan, produce a detailed implementation specification with file structure, key functions, and test stubs:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');
    const output = llmResponse?.content ?? `Implementation stub for "${thought.summary}".`;

    return this.buildResult(
      thought.suggestedAction,
      output,
      { files: [], testFiles: [], usedLLM: !!llmResponse, llmResponse },
      [
        {
          type: 'artifact',
          title: 'Implementation specification',
          summary: 'Produce an implementation artifact and candidate test plan.',
          risk: 'medium',
          requiresApproval: true,
          permissions: ['fs:write'],
          payload: {
            artifactType: 'implementation-spec',
            content: output,
          },
        },
        {
          type: 'tool_call',
          title: 'Inspect repository git status',
          summary: 'Read the current git state before or after implementation work.',
          risk: 'low',
          permissions: ['git:read'],
          toolName: 'git_status',
          toolInput: { cwd: process.cwd() },
        },
      ],
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_pull_request', 'code_review'];
  }
}
