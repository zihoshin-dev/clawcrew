import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class SecurityAgent extends BaseAgent {
  constructor() {
    super(AgentRole.SECURITY, DEFAULT_PERSONAS[AgentRole.SECURITY]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a security engineer. Perform threat modelling (STRIDE) on the following agenda, identifying attack surfaces, authentication weaknesses, data exposure risks, and compliance requirements:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    const reasoning = llmResponse?.content
      ?? 'Performing threat modelling (STRIDE), identifying attack surfaces, auth weaknesses, and data exposure risks.';

    return this.buildThought(
      context,
      `Security assessment for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.92 : 0.9,
      'threat_model',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this security assessment, produce a security report with threats, mitigations, and compliance notes prioritised by severity:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Security report stub for "${thought.summary}".`,
      { threats: [], mitigations: [], complianceNotes: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'enforce_policy', 'audit_dependencies'];
  }
}
