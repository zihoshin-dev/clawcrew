import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { tmpdir } from 'os';
import { join } from 'path';
import { rmSync, existsSync } from 'fs';
import { SqliteProjectStore, InMemoryProjectStore } from '../../src/persistence/sqlite-store.js';
import { Phase } from '../../src/core/types.js';
import type { Project } from '../../src/core/types.js';
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
});
