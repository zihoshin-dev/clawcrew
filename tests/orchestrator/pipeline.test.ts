import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/orchestrator/pipeline.js';
import { Phase, AgentRole } from '../../src/core/types.js';
import type { PhaseConfig, GateContext } from '../../src/orchestrator/pipeline.js';

const EXPECTED_ORDER: Phase[] = [
  Phase.RESEARCH,
  Phase.PLAN,
  Phase.DESIGN,
  Phase.CODE,
  Phase.TEST,
  Phase.REVIEW,
  Phase.DEPLOY,
];

/** Build a GateContext with artifacts for all phases so default gates pass. */
function fullContext(): GateContext {
  const artifacts = new Map<Phase, any[]>();
  for (const phase of EXPECTED_ORDER) {
    if (phase === Phase.TEST) {
      artifacts.set(phase, [{ type: 'test-results', content: { status: 'passing' }, createdBy: 'test', phase }]);
    } else if (phase === Phase.REVIEW) {
      artifacts.set(phase, [{ type: 'review-approval', content: { approved: true }, createdBy: 'test', phase }]);
    } else {
      artifacts.set(phase, [{ type: 'artifact', content: 'ok', createdBy: 'test', phase }]);
    }
  }
  return {
    artifacts,
    tasks: [{ id: 't1', title: 'task', description: '', status: 'completed', phase: Phase.RESEARCH, createdAt: new Date(), updatedAt: new Date() } as any],
  };
}

describe('Pipeline', () => {
  describe('initial state', () => {
    it('starts in the RESEARCH phase', () => {
      const pipeline = new Pipeline();
      expect(pipeline.currentPhase).toBe(Phase.RESEARCH);
    });

    it('exposes all 7 phases in order', () => {
      const pipeline = new Pipeline();
      expect(pipeline.phases).toEqual(EXPECTED_ORDER);
    });
  });

  describe('advance', () => {
    it('moves from RESEARCH to PLAN on first advance()', () => {
      const pipeline = new Pipeline();
      pipeline.advance(fullContext());
      expect(pipeline.currentPhase).toBe(Phase.PLAN);
    });

    it('traverses all phases in the correct order', () => {
      const pipeline = new Pipeline();
      const ctx = fullContext();
      const visited: Phase[] = [pipeline.currentPhase];
      for (let i = 0; i < EXPECTED_ORDER.length - 1; i++) {
        visited.push(pipeline.advance(ctx));
      }
      expect(visited).toEqual(EXPECTED_ORDER);
    });

    it('throws when trying to advance past DEPLOY (final phase)', () => {
      const pipeline = new Pipeline();
      const ctx = fullContext();
      for (let i = 0; i < EXPECTED_ORDER.length - 1; i++) {
        pipeline.advance(ctx);
      }
      expect(pipeline.currentPhase).toBe(Phase.DEPLOY);
      expect(() => pipeline.advance(ctx)).toThrow(/final phase|Cannot advance/);
    });

    it('throws when exit gate conditions are not met', () => {
      const blockingConfig: PhaseConfig[] = [
        {
          phase: Phase.RESEARCH,
          entryGate: [],
          exitGate: [{ name: 'blocker', check: () => false }],
          requiredRoles: [AgentRole.RESEARCHER],
        },
        ...EXPECTED_ORDER.slice(1).map((phase) => ({
          phase,
          entryGate: [],
          exitGate: [{ name: 'ok', check: () => true }],
          requiredRoles: [],
        })),
      ];
      const pipeline = new Pipeline(blockingConfig);
      expect(() => pipeline.advance(fullContext())).toThrow(/Exit gate/);
    });
  });

  describe('canAdvance', () => {
    it('returns true when all exit gate conditions pass with sufficient context', () => {
      const pipeline = new Pipeline();
      expect(pipeline.canAdvance(fullContext())).toBe(true);
    });

    it('returns false when any exit gate condition fails', () => {
      const blockingConfig: PhaseConfig[] = [
        {
          phase: Phase.RESEARCH,
          entryGate: [],
          exitGate: [{ name: 'not done', check: () => false }],
          requiredRoles: [],
        },
        ...EXPECTED_ORDER.slice(1).map((phase) => ({
          phase,
          entryGate: [],
          exitGate: [],
          requiredRoles: [],
        })),
      ];
      const pipeline = new Pipeline(blockingConfig);
      expect(pipeline.canAdvance(fullContext())).toBe(false);
    });
  });

  describe('getPhaseConfig', () => {
    it('returns config for a known phase', () => {
      const pipeline = new Pipeline();
      const cfg = pipeline.getPhaseConfig(Phase.CODE);
      expect(cfg.phase).toBe(Phase.CODE);
      expect(cfg.requiredRoles).toContain(AgentRole.DEVELOPER);
    });
  });

  describe('reset', () => {
    it('returns the pipeline to the RESEARCH phase', () => {
      const pipeline = new Pipeline();
      const ctx = fullContext();
      pipeline.advance(ctx);
      pipeline.advance(ctx);
      pipeline.reset();
      expect(pipeline.currentPhase).toBe(Phase.RESEARCH);
    });
  });
});
