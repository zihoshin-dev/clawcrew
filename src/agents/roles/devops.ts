import { AgentRole } from '../../core/types.js';
import { BaseAgent } from '../base.js';
import { DEFAULT_PERSONAS } from '../persona.js';
import type { ThinkContext, Thought, ActionResult } from '../persona.js';

export class DevOpsAgent extends BaseAgent {
  constructor() {
    super(AgentRole.DEVOPS, DEFAULT_PERSONAS[AgentRole.DEVOPS]);
  }

  async think(context: ThinkContext): Promise<Thought> {
    const prompt = `You are a DevOps engineer. Assess the deployment pipeline, infrastructure requirements, observability needs, and reliability targets for the following:\n\nAgenda: ${context.agenda}\nPhase: ${context.phase}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    const reasoning = llmResponse?.content
      ?? 'Assessing deployment pipeline, infrastructure requirements, observability needs, and reliability targets.';

    return this.buildThought(
      context,
      `Infrastructure plan for: ${context.agenda}`,
      reasoning,
      llmResponse ? 0.85 : 0.81,
      'configure_pipeline',
      { phase: context.phase, usedLLM: !!llmResponse },
    );
  }

  async act(thought: Thought): Promise<ActionResult> {
    const prompt = `Based on this infrastructure assessment, produce a spec covering pipeline configuration, infrastructure components, and monitoring setup:\n\n${thought.reasoning}`;
    const llmResponse = await this.callLLM(prompt, 'medium');

    return this.buildResult(
      thought.suggestedAction,
      llmResponse?.content ?? `Infrastructure spec stub for "${thought.summary}".`,
      { pipeline: [], infrastructure: [], monitors: [], usedLLM: !!llmResponse },
    );
  }

  override getCapabilities(): string[] {
    return [...super.getCapabilities(), 'incident_response', 'manage_secrets'];
  }
}
