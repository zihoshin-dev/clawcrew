import { Phase, AgentRole } from '../core/types.js';
import type { EventBus } from '../core/event-bus.js';
import type { AigoraEvents } from '../core/event-bus.js';
import { Pipeline } from './pipeline.js';

export interface Artifact {
  type: string;
  content: unknown;
  createdBy: string;
  phase: Phase;
}

export class PhaseManager {
  private readonly pipeline: Pipeline;
  private readonly eventBus: EventBus<AigoraEvents>;
  private readonly artifacts: Map<Phase, Artifact[]> = new Map();
  private activeProjectId: string = 'default';

  constructor(pipeline: Pipeline, eventBus: EventBus<AigoraEvents>) {
    this.pipeline = pipeline;
    this.eventBus = eventBus;
  }

  setProjectId(projectId: string): void {
    this.activeProjectId = projectId;
  }

  async startPhase(phase: Phase): Promise<void> {
    const config = this.pipeline.getPhaseConfig(phase);
    const missingRoles: AgentRole[] = config.requiredRoles;

    // Surface the required team composition via the event bus
    // (actual agent assembly is handled by the orchestration engine)
    if (missingRoles.length > 0) {
      // Emit a synthetic log via ErrorOccurred so callers can trace team assembly
      // without coupling PhaseManager to specific agent spawning logic.
      this.eventBus.emit('ErrorOccurred', {
        context: `PhaseManager.startPhase — assembling team for ${phase}: required roles [${missingRoles.join(', ')}]`,
        error: new Error(`Phase ${phase} starting — assembling required roles`),
        occurredAt: new Date(),
      });
    }

    if (!this.artifacts.has(phase)) {
      this.artifacts.set(phase, []);
    }
  }

  async completePhase(phase: Phase, artifacts: Artifact[]): Promise<void> {
    const existing = this.artifacts.get(phase) ?? [];
    this.artifacts.set(phase, [...existing, ...artifacts]);

    const phases = this.pipeline.phases;
    const currentIdx = phases.indexOf(phase);
    const previousPhase = currentIdx > 0 ? (phases[currentIdx - 1] ?? phase) : phase;

    this.eventBus.emit('PhaseChanged', {
      projectId: this.activeProjectId,
      previousPhase,
      currentPhase: phase,
      changedAt: new Date(),
    });
  }

  getArtifacts(phase: Phase): Artifact[] {
    return [...(this.artifacts.get(phase) ?? [])];
  }

  getAllArtifacts(): Map<Phase, Artifact[]> {
    const copy = new Map<Phase, Artifact[]>();
    for (const [phase, arts] of this.artifacts) {
      copy.set(phase, [...arts]);
    }
    return copy;
  }
}
