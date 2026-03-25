import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class MediatorAgent extends BaseAgent {
  constructor() {
    super(AgentRole.MEDIATOR, DEFAULT_PERSONAS[AgentRole.MEDIATOR]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const divergentMessages = context.recentMessages.length;
    const prompt = `You are a skilled mediator. Analyse ${divergentMessages} recent messages for conflicting positions and identify the shared goal beneath competing viewpoints:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}\nRecent messages: ${context.recentMessages.map((m) => m.content).join('\n')}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? `Analysing ${divergentMessages} recent messages for conflicting positions. Identifying the shared goal beneath competing viewpoints.`;

    return this.buildThought(
      context,
      `Mediation for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.77 : 0.72,
      'facilitate_discussion',
      { phase: context.phase, messageCount: divergentMessages, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this mediation analysis, produce a summary identifying positions, common ground, and a proposed path forward:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Mediation summary stub for "${thought.summary}".`,
      { positions: [], commonGround: '', proposedPath: '', usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'build_consensus', 'propose_compromise'];
  }
}
