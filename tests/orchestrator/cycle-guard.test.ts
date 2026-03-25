import { describe, it, expect, beforeEach } from 'vitest';
import { CycleGuard } from '../../src/orchestrator/cycle-guard.js';

describe('CycleGuard', () => {
  let guard: CycleGuard;

  beforeEach(() => {
    guard = new CycleGuard({ maxCycles: 5, oscillationWindow: 3, oscillationThreshold: 0.85 });
  });

  it('shouldStop returns false when no cycles recorded', () => {
    const { stop } = guard.shouldStop();
    expect(stop).toBe(false);
  });

  it('shouldStop returns false when under maxCycles', () => {
    guard.recordCycle('output one');
    guard.recordCycle('output two different');
    const { stop } = guard.shouldStop();
    expect(stop).toBe(false);
  });

  it('shouldStop returns true with reason when maxCycles reached', () => {
    for (let i = 0; i < 5; i++) {
      guard.recordCycle(`unique output ${i}`);
    }
    const { stop, reason } = guard.shouldStop();
    expect(stop).toBe(true);
    expect(reason).toMatch(/max cycles/i);
  });

  it('detects oscillation when outputs are nearly identical', () => {
    const repeated = 'the agent decided to implement a caching layer for the database queries';
    guard.recordCycle(repeated);
    guard.recordCycle(repeated);
    guard.recordCycle(repeated);
    const { stop, reason } = guard.shouldStop();
    expect(stop).toBe(true);
    expect(reason).toMatch(/oscillation/i);
  });

  it('does not flag oscillation for diverse outputs', () => {
    guard.recordCycle('researching database options and comparing postgres versus mysql');
    guard.recordCycle('implementing the authentication service with jwt tokens');
    guard.recordCycle('writing unit tests for the payment processing module');
    const { stop } = guard.shouldStop();
    expect(stop).toBe(false);
  });

  it('reset clears cycle count and output history', () => {
    for (let i = 0; i < 5; i++) guard.recordCycle('x');
    guard.reset();
    expect(guard.cycles).toBe(0);
    const { stop } = guard.shouldStop();
    expect(stop).toBe(false);
  });

  it('cycles property tracks recorded cycles accurately', () => {
    guard.recordCycle('a');
    guard.recordCycle('b');
    expect(guard.cycles).toBe(2);
  });

  it('uses default maxCycles of 20 when not configured', () => {
    const defaultGuard = new CycleGuard();
    for (let i = 0; i < 19; i++) {
      defaultGuard.recordCycle(`diverse output ${i} with unique content about topic ${i * 7}`);
    }
    expect(defaultGuard.shouldStop().stop).toBe(false);
    defaultGuard.recordCycle('final output');
    expect(defaultGuard.shouldStop().stop).toBe(true);
  });

  it('oscillation reason includes threshold value', () => {
    const repeated = 'same output text repeated for oscillation detection test case here';
    guard.recordCycle(repeated);
    guard.recordCycle(repeated);
    guard.recordCycle(repeated);
    const { reason } = guard.shouldStop();
    expect(reason).toMatch(/threshold/i);
  });

  it('detects stride-2 oscillation (A,B,A pattern)', () => {
    const outputA = 'the agent decided to implement a caching layer for database queries to improve performance';
    const outputB = 'the agent chose to refactor the authentication module using jwt tokens for security';
    // A, B, A — stride-2: outputs[0] and outputs[2] are identical → oscillation
    guard.recordCycle(outputA);
    guard.recordCycle(outputB);
    guard.recordCycle(outputA);
    const { stop, reason } = guard.shouldStop();
    expect(stop).toBe(true);
    expect(reason).toMatch(/oscillation/i);
  });

  it('does not flag stride-2 oscillation for truly diverse outputs', () => {
    guard.recordCycle('researching database options comparing postgres versus mysql for the project');
    guard.recordCycle('implementing jwt authentication service with refresh token rotation logic');
    guard.recordCycle('writing unit tests for payment processing module with stripe integration');
    const { stop } = guard.shouldStop();
    expect(stop).toBe(false);
  });
});
