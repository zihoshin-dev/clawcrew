import { describe, it, expect } from 'vitest';
import { Phase, RunMode, RunSource } from '../../src/core/types.js';
import { buildActionBatchPreview, createDefaultStepsForRun, createRunForProject } from '../../src/core/runtime.js';
import type { Project, Run, RunStep } from '../../src/core/types.js';

function makeProject(): Project {
  const now = new Date();
  return {
    id: 'project-1',
    agenda: 'Test runtime model',
    channel: 'local',
    phase: Phase.RESEARCH,
    status: 'active',
    agentIds: [],
    tasks: [],
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe('runtime model helpers', () => {
  it('creates a review-mode run with default bounded budget', () => {
    const run = createRunForProject(makeProject(), { source: RunSource.CLI, mode: RunMode.REVIEW });
    expect(run.mode).toBe(RunMode.REVIEW);
    expect(run.status).toBe('queued');
    expect(run.budget?.maxCostUsd).toBeDefined();
  });

  it('creates queued-first default steps for review mode', () => {
    const run = createRunForProject(makeProject(), { mode: RunMode.REVIEW });
    const steps = createDefaultStepsForRun(run);
    expect(steps[0]?.status).toBe('queued');
    expect(steps.at(-1)?.phase).toBe(Phase.REVIEW);
    expect(steps.some((step) => step.phase === Phase.CODE)).toBe(true);
  });

  it('builds an approval-required action preview for review-mode code step', () => {
    const run: Run = createRunForProject(makeProject(), { mode: RunMode.REVIEW });
    const step: RunStep = {
      id: 'step-1',
      runId: run.id,
      key: 'code-1',
      title: 'Implement',
      phase: Phase.CODE,
      status: 'running',
      sequence: 3,
      assignedRoles: [],
      retryCount: 0,
    };

    const preview = buildActionBatchPreview(run, step, [
      {
        type: 'artifact',
        title: 'Implementation specification',
        summary: 'Proposes filesystem changes',
        risk: 'medium',
        permissions: ['fs:write'],
        requiresApproval: true,
      },
    ]);

    expect(preview.approvalRequired).toBe(true);
    expect(preview.blastRadius.permissions).toContain('fs:write');
  });
});
