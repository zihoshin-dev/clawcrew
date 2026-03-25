import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class UxResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.UX_RESEARCHER, DEFAULT_PERSONAS[AgentRole.UX_RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a UX researcher. Synthesise user behaviours, needs, and pain points into personas and journey maps that ground decisions in reality for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Synthesising user behaviours, needs, and pain points into personas and journey maps that ground decisions in reality.';

    return this.buildThought(
      context,
      `User research for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.84 : 0.79,
      'produce_user_research_report',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this user research analysis, produce a report with user personas, journey maps, and prioritised pain points:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `User research report stub for "${thought.summary}".`,
      { personas: [], journeyMaps: [], painPoints: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'usability_testing', 'interview_synthesis'];
  }
}
