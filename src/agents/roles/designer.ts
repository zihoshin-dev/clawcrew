import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DesignerAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DESIGNER, DEFAULT_PERSONAS[AgentRole.DESIGNER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a UX designer. Map user journeys, identify friction points, and ensure the following solution is accessible and intuitive:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Mapping user journeys, identifying friction points, and ensuring the solution is accessible and intuitive.';

    return this.buildThought(
      context,
      `UX design for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.81 : 0.76,
      'define_user_flow',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this UX analysis, produce a design specification with user flows, wireframe descriptions, and accessibility notes:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Design spec stub for "${thought.summary}".`,
      { userFlows: [], wireframes: [], accessibilityNotes: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'audit_accessibility', 'prototype'];
  }
}
