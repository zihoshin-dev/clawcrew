import { Phase, AgentRole } from '../core/types.js';

export interface GateCondition {
  description: string;
  check: () => boolean;
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
    exitGate: [{ description: 'Research artifacts produced', check: () => true }],
    requiredRoles: [AgentRole.RESEARCHER, AgentRole.ANALYST],
    optionalRoles: [AgentRole.PM],
  },
  {
    phase: Phase.PLAN,
    entryGate: [{ description: 'Research complete', check: () => true }],
    exitGate: [{ description: 'Plan approved', check: () => true }],
    requiredRoles: [AgentRole.PM, AgentRole.ARCHITECT],
    optionalRoles: [AgentRole.SCRUM_MASTER],
  },
  {
    phase: Phase.DESIGN,
    entryGate: [{ description: 'Plan approved', check: () => true }],
    exitGate: [{ description: 'Design artifacts ready', check: () => true }],
    requiredRoles: [AgentRole.DESIGNER, AgentRole.ARCHITECT],
    optionalRoles: [AgentRole.CRITIC],
  },
  {
    phase: Phase.CODE,
    entryGate: [{ description: 'Design complete', check: () => true }],
    exitGate: [{ description: 'Implementation complete', check: () => true }],
    requiredRoles: [AgentRole.DEVELOPER],
    optionalRoles: [AgentRole.ARCHITECT, AgentRole.SECURITY],
  },
  {
    phase: Phase.TEST,
    entryGate: [{ description: 'Code complete', check: () => true }],
    exitGate: [{ description: 'All tests passing', check: () => true }],
    requiredRoles: [AgentRole.QA],
    optionalRoles: [AgentRole.SECURITY, AgentRole.DEVELOPER],
  },
  {
    phase: Phase.REVIEW,
    entryGate: [{ description: 'Tests passing', check: () => true }],
    exitGate: [{ description: 'Review approved', check: () => true }],
    requiredRoles: [AgentRole.CRITIC, AgentRole.JUDGE],
    optionalRoles: [AgentRole.SECURITY, AgentRole.ARCHITECT],
  },
  {
    phase: Phase.DEPLOY,
    entryGate: [{ description: 'Review approved', check: () => true }],
    exitGate: [{ description: 'Deployment successful', check: () => true }],
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

  canAdvance(): boolean {
    const cfg = this.getPhaseConfig(this._currentPhase);
    return cfg.exitGate.every((cond) => cond.check());
  }

  advance(): Phase {
    if (!this.canAdvance()) {
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
