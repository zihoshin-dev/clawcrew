import { describe, it, expect } from 'vitest';
import { Pipeline } from '../../src/orchestrator/pipeline.js';
import { Phase, AgentRole } from '../../src/core/types.js';
import type { PhaseConfig } from '../../src/orchestrator/pipeline.js';

const EXPECTED_ORDER: Phase[] = [
  Phase.RESEARCH,
  Phase.PLAN,
  Phase.DESIGN,
  Phase.CODE,
  Phase.TEST,
  Phase.REVIEW,
  Phase.DEPLOY,
];

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
      pipeline.advance();
      expect(pipeline.currentPhase).toBe(Phase.PLAN);
    });

    it('traverses all phases in the correct order', () => {
      const pipeline = new Pipeline();
      const visited: Phase[] = [pipeline.currentPhase];
      for (let i = 0; i < EXPECTED_ORDER.length - 1; i++) {
        visited.push(pipeline.advance());
      }
      expect(visited).toEqual(EXPECTED_ORDER);
    });

    it('throws when trying to advance past DEPLOY (final phase)', () => {
      const pipeline = new Pipeline();
      for (let i = 0; i < EXPECTED_ORDER.length - 1; i++) {
        pipeline.advance();
      }
      expect(pipeline.currentPhase).toBe(Phase.DEPLOY);
      expect(() => pipeline.advance()).toThrow(/final phase|Cannot advance/);
    });

    it('throws when exit gate conditions are not met', () => {
      const blockingConfig: PhaseConfig[] = [
        {
          phase: Phase.RESEARCH,
          entryGate: [],
          exitGate: [{ description: 'blocker', check: () => false }],
          requiredRoles: [AgentRole.RESEARCHER],
        },
        ...EXPECTED_ORDER.slice(1).map((phase) => ({
          phase,
          entryGate: [],
          exitGate: [{ description: 'ok', check: () => true }],
          requiredRoles: [],
        })),
      ];
      const pipeline = new Pipeline(blockingConfig);
      expect(() => pipeline.advance()).toThrow(/Exit gate/);
    });
  });

  describe('canAdvance', () => {
    it('returns true when all exit gate conditions pass', () => {
      const pipeline = new Pipeline();
      expect(pipeline.canAdvance()).toBe(true);
    });

    it('returns false when any exit gate condition fails', () => {
      const blockingConfig: PhaseConfig[] = [
        {
          phase: Phase.RESEARCH,
          entryGate: [],
          exitGate: [{ description: 'not done', check: () => false }],
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
      expect(pipeline.canAdvance()).toBe(false);
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
      pipeline.advance();
      pipeline.advance();
      pipeline.reset();
      expect(pipeline.currentPhase).toBe(Phase.RESEARCH);
    });
  });
});
