import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class ArchitectAgent extends BaseAgent {
  constructor() {
    super(AgentRole.ARCHITECT, DEFAULT_PERSONAS[AgentRole.ARCHITECT]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a software architect. Evaluate the following agenda and identify system components, interfaces, trade-offs, scalability concerns, and maintainability risks:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    const reasoning = llmResponse?.content
      ?? 'Evaluating system components, interfaces, and trade-offs. Checking for scalability and maintainability concerns.';

    return this.buildThought(
      context,
      `Architecture design for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.8,
      'design_system',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this architectural analysis, produce a structured Architecture Decision Record (ADR) with components, decisions, and trade-offs:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'high');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Architecture decision record stub for "${thought.summary}".`,
      { components: [], decisions: [], tradeOffs: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'create_adr', 'define_api_contract'];
  }
}
