import { Phase, AgentRole } from '../core/types.js';
import type { Task } from '../core/types.js';
import type { Artifact } from './phase-manager.js';

export interface GateContext {
  artifacts: Map<Phase, Artifact[]>;
  tasks: Task[];
}

export interface GateCondition {
  name: string;
  check: (ctx: GateContext) => boolean;
  /** When true, a HumanGateManager must obtain explicit approval before the gate passes. */
  requiresHumanApproval?: boolean;
}

export interface PhaseConfig {
  phase: Phase;
  entryGate: GateCondition[];
  exitGate: GateCondition[];
  requiredRoles: AgentRole[];
  optionalRoles?: AgentRole[];
}

const PHASE_ORDER: Phase[] = [
  Phase.RESEARCH,
  Phase.PLAN,
  Phase.DESIGN,
  Phase.CODE,
  Phase.TEST,
  Phase.REVIEW,
  Phase.DEPLOY,
];

const DEFAULT_PHASE_CONFIGS: PhaseConfig[] = [
  {
    phase: Phase.RESEARCH,
    entryGate: [],
    exitGate: [
      {
        name: 'research-artifacts-exist',
        check: (ctx) => (ctx.artifacts.get(Phase.RESEARCH)?.length ?? 0) >= 1,
      },
    ],
    requiredRoles: [AgentRole.RESEARCHER, AgentRole.ANALYST],
    optionalRoles: [AgentRole.PM],
  },
  {
    phase: Phase.PLAN,
    entryGate: [
      {
        name: 'research-complete',
        check: (ctx) => (ctx.artifacts.get(Phase.RESEARCH)?.length ?? 0) >= 1,
      },
    ],
    exitGate: [
      {
        name: 'task-board-has-tasks',
        check: (ctx) => ctx.tasks.length >= 1,
        requiresHumanApproval: true,
      },
    ],
    requiredRoles: [AgentRole.PM, AgentRole.ARCHITECT],
    optionalRoles: [AgentRole.SCRUM_MASTER],
  },
  {
    phase: Phase.DESIGN,
    entryGate: [
      {
        name: 'plan-approved',
        check: (ctx) => ctx.tasks.length >= 1,
      },
    ],
    exitGate: [
      {
        name: 'design-artifact-exists',
        check: (ctx) =>
          (ctx.artifacts.get(Phase.DESIGN)?.length ?? 0) >= 1,
        requiresHumanApproval: true,
      },
    ],
    requiredRoles: [AgentRole.DESIGNER, AgentRole.ARCHITECT],
    optionalRoles: [AgentRole.CRITIC],
  },
  {
    phase: Phase.CODE,
    entryGate: [
      {
        name: 'design-complete',
        check: (ctx) => (ctx.artifacts.get(Phase.DESIGN)?.length ?? 0) >= 1,
      },
    ],
    exitGate: [
      {
        name: 'code-artifact-exists',
        check: (ctx) => (ctx.artifacts.get(Phase.CODE)?.length ?? 0) >= 1,
      },
    ],
    requiredRoles: [AgentRole.DEVELOPER],
    optionalRoles: [AgentRole.ARCHITECT, AgentRole.SECURITY],
  },
  {
    phase: Phase.TEST,
    entryGate: [
      {
        name: 'code-complete',
        check: (ctx) => (ctx.artifacts.get(Phase.CODE)?.length ?? 0) >= 1,
      },
    ],
    exitGate: [
      {
        name: 'test-results-passing',
        check: (ctx) => {
          const testArtifacts = ctx.artifacts.get(Phase.TEST) ?? [];
          return testArtifacts.some(
            (a) =>
              a.type === 'test-results' &&
              (a.content as { status?: string } | null)?.status === 'passing',
          );
        },
      },
    ],
    requiredRoles: [AgentRole.QA],
    optionalRoles: [AgentRole.SECURITY, AgentRole.DEVELOPER],
  },
  {
    phase: Phase.REVIEW,
    entryGate: [
      {
        name: 'tests-passing',
        check: (ctx) => {
          const testArtifacts = ctx.artifacts.get(Phase.TEST) ?? [];
          return testArtifacts.some(
            (a) =>
              a.type === 'test-results' &&
              (a.content as { status?: string } | null)?.status === 'passing',
          );
        },
      },
    ],
    exitGate: [
      {
        name: 'review-approval-exists',
        check: (ctx) => {
          const reviewArtifacts = ctx.artifacts.get(Phase.REVIEW) ?? [];
          return reviewArtifacts.some((a) => a.type === 'review-approval');
        },
      },
    ],
    requiredRoles: [AgentRole.CRITIC, AgentRole.JUDGE],
    optionalRoles: [AgentRole.SECURITY, AgentRole.ARCHITECT],
  },
  {
    phase: Phase.DEPLOY,
    entryGate: [
      {
        name: 'all-previous-phases-have-artifacts',
        check: (ctx) => {
          const required: Phase[] = [
            Phase.RESEARCH,
            Phase.PLAN,
            Phase.DESIGN,
            Phase.CODE,
            Phase.TEST,
            Phase.REVIEW,
          ];
          return required.every(
            (phase) => (ctx.artifacts.get(phase)?.length ?? 0) >= 1,
          );
        },
        requiresHumanApproval: true,
      },
    ],
    exitGate: [
      {
        name: 'deployment-successful',
        check: (ctx) => (ctx.artifacts.get(Phase.DEPLOY)?.length ?? 0) >= 1,
      },
    ],
    requiredRoles: [AgentRole.DEVOPS],
    optionalRoles: [AgentRole.PM],
  },
];

export class Pipeline {
  readonly phases: Phase[] = [...PHASE_ORDER];
  private _currentPhase: Phase = Phase.RESEARCH;
  private readonly configs: Map<Phase, PhaseConfig> = new Map();

  constructor(configs?: PhaseConfig[]) {
    const source = configs ?? DEFAULT_PHASE_CONFIGS;
    for (const cfg of source) {
      this.configs.set(cfg.phase, cfg);
    }
  }

  get currentPhase(): Phase {
    return this._currentPhase;
  }

  getPhaseConfig(phase: Phase): PhaseConfig {
    const cfg = this.configs.get(phase);
    if (cfg === undefined) {
      throw new Error(`No config found for phase: ${phase}`);
    }
    return cfg;
  }

  canAdvance(ctx?: GateContext): boolean {
    const cfg = this.getPhaseConfig(this._currentPhase);
    const effectiveCtx: GateContext = ctx ?? {
      artifacts: new Map(),
      tasks: [],
    };
    return cfg.exitGate.every((cond) => cond.check(effectiveCtx));
  }

  advance(ctx?: GateContext): Phase {
    if (!this.canAdvance(ctx)) {
      throw new Error(`Exit gate conditions not met for phase: ${this._currentPhase}`);
    }

    const idx = this.phases.indexOf(this._currentPhase);
    if (idx === -1 || idx === this.phases.length - 1) {
      throw new Error(`Cannot advance past final phase: ${this._currentPhase}`);
    }

    const nextPhase = this.phases[idx + 1];
    if (nextPhase === undefined) {
      throw new Error(`No next phase after: ${this._currentPhase}`);
    }

    this._currentPhase = nextPhase;
    return this._currentPhase;
  }

  reset(): void {
    this._currentPhase = Phase.RESEARCH;
  }
}
