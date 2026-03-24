import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class SecurityAgent extends BaseAgent {
  constructor() {
    super(AgentRole.SECURITY, DEFAULT_PERSONAS[AgentRole.SECURITY]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Security assessment for: ${context.agenda}`,
      'Performing threat modelling (STRIDE), identifying attack surfaces, auth weaknesses, and data exposure risks.',
      0.9,
      'threat_model',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Security report stub for "${thought.summary}". LLM call will be wired here.`,
      { threats: [], mitigations: [], complianceNotes: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'enforce_policy', 'audit_dependencies'];
  }
}
