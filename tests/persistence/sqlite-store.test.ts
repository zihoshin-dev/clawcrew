import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';
import { SqliteProjectStore, InMemoryProjectStore } from '../../src/persistence/sqlite-store.js';
import { Phase } from '../../src/core/types.js';
import { RunMode, RunSource } from '../../src/core/types.js';
import type { ApprovalRequestRecord, Project, Run, RunEvent, RunStep, RuntimeArtifact } from '../../src/core/types.js';
import type { CostEntry } from '../../src/persistence/types.js';
import { nanoid } from 'nanoid';

function makeProject(overrides: Partial<Project> = {}): Project {
  const now = new Date();
  return {
    id: nanoid(),
    agenda: 'test agenda',
    channel: 'general',
    phase: Phase.RESEARCH,
    status: 'active',
    agentIds: [],
    tasks: [],
    messages: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCostEntry(projectId: string, overrides: Partial<CostEntry> = {}): CostEntry {
  return {
    id: nanoid(),
    projectId,
    agentId: 'agent-1',
    model: 'claude-haiku',
    provider: 'anthropic',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    cost: 0.001,
    recordedAt: new Date(),
    ...overrides,
  };
}

function makeRun(project: Project, overrides: Partial<Run> = {}): Run {
  const now = new Date();
  return {
    id: nanoid(),
    projectId: project.id,
    agenda: project.agenda,
    channel: project.channel,
    source: RunSource.CLI,
    mode: RunMode.REVIEW,
    autonomy: 'review',
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRunStep(run: Run, overrides: Partial<RunStep> = {}): RunStep {
  return {
    id: nanoid(),
    runId: run.id,
    key: 'research-1',
    title: 'Research the agenda',
    phase: Phase.RESEARCH,
    status: 'queued',
    sequence: 1,
    assignedRoles: [],
    retryCount: 0,
    ...overrides,
  };
}

function makeRunEvent(run: Run, overrides: Partial<RunEvent> = {}): RunEvent {
  return {
    id: nanoid(),
    runId: run.id,
    type: 'run.created',
    message: 'Run created',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeApproval(run: Run, step: RunStep, overrides: Partial<ApprovalRequestRecord> = {}): ApprovalRequestRecord {
  return {
    id: nanoid(),
    runId: run.id,
    stepId: step.id,
    projectId: run.projectId,
    phase: step.phase,
    channel: run.channel,
    status: 'pending',
    summary: 'Approval needed',
    timeoutMs: 1_000,
    requestedAt: new Date(),
    ...overrides,
  };
}

function makeRuntimeArtifact(run: Run, step: RunStep, overrides: Partial<RuntimeArtifact> = {}): RuntimeArtifact {
  return {
    id: nanoid(),
    runId: run.id,
    stepId: step.id,
    projectId: run.projectId,
    name: 'artifact',
    type: 'tool-output',
    content: { ok: true },
    createdAt: new Date(),
    ...overrides,
  };
}

describe('SqliteProjectStore', () => {
  let store: SqliteProjectStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = join(tmpdir(), `clawcrew-test-${nanoid()}.db`);
    store = new SqliteProjectStore(dbPath);
  });

  afterEach(() => {
    store.close();
    if (existsSync(dbPath)) rmSync(dbPath);
  });

  it('saves and retrieves a project by id', () => {
    const p = makeProject();
    store.saveProject(p);
    const retrieved = store.getProject(p.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.id).toBe(p.id);
    expect(retrieved!.agenda).toBe(p.agenda);
  });

  it('returns undefined for unknown project id', () => {
    expect(store.getProject('nonexistent')).toBeUndefined();
  });

  it('getAllProjects returns empty array when no projects exist', () => {
    expect(store.getAllProjects()).toEqual([]);
  });

  it('getAllProjects returns all saved projects', () => {
    const p1 = makeProject({ agenda: 'agenda-1' });
    const p2 = makeProject({ agenda: 'agenda-2' });
    store.saveProject(p1);
    store.saveProject(p2);
    const all = store.getAllProjects();
    expect(all).toHaveLength(2);
    const agendas = all.map((p) => p.agenda);
    expect(agendas).toContain('agenda-1');
    expect(agendas).toContain('agenda-2');
  });

  it('upserts a project (save twice updates)', () => {
    const p = makeProject({ agenda: 'original' });
    store.saveProject(p);
    const updated = { ...p, agenda: 'updated', phase: Phase.PLAN };
    store.saveProject(updated);
    const retrieved = store.getProject(p.id);
    expect(retrieved!.agenda).toBe('updated');
    expect(retrieved!.phase).toBe(Phase.PLAN);
  });

  it('deletes a project by id', () => {
    const p = makeProject();
    store.saveProject(p);
    store.deleteProject(p.id);
    expect(store.getProject(p.id)).toBeUndefined();
  });

  it('persists agentIds array correctly', () => {
    const p = makeProject({ agentIds: ['a1', 'a2', 'a3'] });
    store.saveProject(p);
    const retrieved = store.getProject(p.id);
    expect(retrieved!.agentIds).toEqual(['a1', 'a2', 'a3']);
  });

  it('persists metadata field', () => {
    const p = makeProject({ metadata: { key: 'value', count: 42 } });
    store.saveProject(p);
    const retrieved = store.getProject(p.id);
    expect(retrieved!.metadata).toEqual({ key: 'value', count: 42 });
  });

  it('saves and retrieves cost entries', () => {
    const p = makeProject();
    store.saveProject(p);
    const entry = makeCostEntry(p.id);
    store.saveCostEntry(entry);
    const entries = store.getCostByProject(p.id);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.cost).toBe(entry.cost);
    expect(entries[0]!.model).toBe(entry.model);
  });

  it('getTotalCost returns sum of all cost entries', () => {
    const p = makeProject();
    store.saveProject(p);
    store.saveCostEntry(makeCostEntry(p.id, { cost: 0.01 }));
    store.saveCostEntry(makeCostEntry(p.id, { cost: 0.02 }));
    expect(store.getTotalCost()).toBeCloseTo(0.03);
  });

  it('getTotalCost returns 0 when no entries exist', () => {
    expect(store.getTotalCost()).toBe(0);
  });

  it('saves and retrieves runs and run steps', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    store.saveRun(run);
    store.saveRunStep(step);

    expect(store.getRun(run.id)?.projectId).toBe(project.id);
    expect(store.getRunSteps(run.id)).toHaveLength(1);
    expect(store.getCurrentRunStep(run.id)?.id).toBe(step.id);
  });

  it('appends run events in time order', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    store.saveRun(run);
    const first = makeRunEvent(run, { message: 'first' });
    const second = makeRunEvent(run, { message: 'second', createdAt: new Date(Date.now() + 10) });
    store.appendRunEvent(first);
    store.appendRunEvent(second);

    expect(store.getRunEvents(run.id).map((event) => event.message)).toEqual(['first', 'second']);
  });

  it('saves and resolves approval requests', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    const approval = makeApproval(run, step);
    store.saveRun(run);
    store.saveRunStep(step);
    store.saveApprovalRequest(approval);

    expect(store.getPendingApprovalForRun(run.id)?.id).toBe(approval.id);
    const resolved = store.resolveApprovalRequest(approval.id, {
      status: 'approved',
      respondedAt: new Date(),
      approvedBy: 'tester',
      comment: 'ok',
    });
    expect(resolved?.status).toBe('approved');
    expect(store.getPendingApprovalForRun(run.id)).toBeUndefined();
  });

  it('saves and retrieves runtime artifacts', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    const artifact = makeRuntimeArtifact(run, step);
    store.saveRun(run);
    store.saveRunStep(step);
    store.saveRuntimeArtifact(artifact);

    expect(store.getRuntimeArtifacts(run.id)).toHaveLength(1);
    expect(store.getRuntimeArtifacts(run.id, step.id)[0]?.id).toBe(artifact.id);
  });

  it('tracks cost by run as well as by project', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    store.saveRun(run);
    store.saveCostEntry(makeCostEntry(project.id, { runId: run.id, cost: 0.02 }));
    store.saveCostEntry(makeCostEntry(project.id, { runId: run.id, cost: 0.03 }));

    expect(store.getCostByRun(run.id)).toHaveLength(2);
    expect(store.getCostSummary(undefined, run.id).totalCost).toBeCloseTo(0.05);
  });

  it('cascades runtime artifacts and costs when deleting a project in SQLite', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    store.saveRun(run);
    store.saveRunStep(step);
    store.saveRuntimeArtifact(makeRuntimeArtifact(run, step));
    store.saveCostEntry(makeCostEntry(project.id, { runId: run.id, cost: 0.02 }));

    store.deleteProject(project.id);

    expect(store.getProject(project.id)).toBeUndefined();
    expect(store.getRun(run.id)).toBeUndefined();
    expect(store.getRuntimeArtifacts(run.id)).toHaveLength(0);
    expect(store.getCostByProject(project.id)).toHaveLength(0);
  });
});

describe('InMemoryProjectStore', () => {
  let store: InMemoryProjectStore;

  beforeEach(() => {
    store = new InMemoryProjectStore();
  });

  it('saves and retrieves a project', () => {
    const p = makeProject();
    store.saveProject(p);
    expect(store.getProject(p.id)).toBeDefined();
  });

  it('returns undefined for unknown id', () => {
    expect(store.getProject('missing')).toBeUndefined();
  });

  it('getAllProjects returns all saved projects', () => {
    store.saveProject(makeProject());
    store.saveProject(makeProject());
    expect(store.getAllProjects()).toHaveLength(2);
  });

  it('deleteProject removes the project', () => {
    const p = makeProject();
    store.saveProject(p);
    store.deleteProject(p.id);
    expect(store.getProject(p.id)).toBeUndefined();
  });

  it('stores runs and approvals in memory', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    const approval = makeApproval(run, step);

    store.saveRun(run);
    store.saveRunStep(step);
    store.saveApprovalRequest(approval);

    expect(store.getRun(run.id)?.id).toBe(run.id);
    expect(store.getPendingApprovalForRun(run.id)?.id).toBe(approval.id);
  });

  it('cascades runtime state when deleting a project in memory', () => {
    const project = makeProject();
    store.saveProject(project);
    const run = makeRun(project);
    const step = makeRunStep(run);
    store.saveRun(run);
    store.saveRunStep(step);
    store.saveApprovalRequest(makeApproval(run, step));
    store.saveRuntimeArtifact(makeRuntimeArtifact(run, step));
    store.saveCostEntry(makeCostEntry(project.id, { runId: run.id }));

    store.deleteProject(project.id);

    expect(store.getProject(project.id)).toBeUndefined();
    expect(store.getRun(run.id)).toBeUndefined();
    expect(store.getRunSteps(run.id)).toHaveLength(0);
    expect(store.getPendingApprovalForRun(run.id)).toBeUndefined();
    expect(store.getRuntimeArtifacts(run.id)).toHaveLength(0);
    expect(store.getCostByRun(run.id)).toHaveLength(0);
  });
});
