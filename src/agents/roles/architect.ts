import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super(AgentRole.ARCHITECT, DEFAULT_PERSONAS[AgentRole.ARCHITECT]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `Architecture design for: ${context.agenda}`,
      'Evaluating system components, interfaces, and trade-offs. Checking for scalability and maintainability concerns.',
      0.8,
      'design_system',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `Architecture decision record stub for "${thought.summary}". LLM call will be wired here.`,
      { components: [], decisions: [], tradeOffs: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_adr', 'define_api_contract'];
  }
}
