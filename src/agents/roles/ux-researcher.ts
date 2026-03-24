import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class UxResearcherAgent extends BaseAgent {
  constructor() {
    super(AgentRole.UX_RESEARCHER, DEFAULT_PERSONAS[AgentRole.UX_RESEARCHER]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(
      context,
      `User research for: ${context.agenda}`,
      'Synthesising user behaviours, needs, and pain points into personas and journey maps that ground decisions in reality.',
      0.79,
      'produce_user_research_report',
      { phase: context.phase },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(
      thought.suggestedAction,
      `User research report stub for "${thought.summary}". LLM call will be wired here.`,
      { personas: [], journeyMaps: [], painPoints: [] },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'usability_testing', 'interview_synthesis'];
  }
}
