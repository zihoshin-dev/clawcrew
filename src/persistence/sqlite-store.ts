import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import type { Project, Task, Message } from '../core/types.js';
import type { ProjectStore, CostEntry } from './types.js';

// ---------------------------------------------------------------------------
// SqliteProjectStore
// ---------------------------------------------------------------------------

export class SqliteProjectStore implements ProjectStore {
  private readonly db: Database.Database;

  constructor(dbPath: string = './data/clawcrew.db') {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this._createTables();
  }

  private _createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        agenda TEXT NOT NULL,
        channel TEXT NOT NULL,
        phase TEXT NOT NULL,
        status TEXT NOT NULL,
        agent_ids TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        assigned_to TEXT,
        phase TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        completed_at TEXT,
        result TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        channel TEXT NOT NULL,
        content TEXT NOT NULL,
        phase TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        reply_to_id TEXT,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        task_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cost_tracking (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        total_tokens INTEGER NOT NULL,
        cost REAL NOT NULL,
        recorded_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
      CREATE INDEX IF NOT EXISTS idx_messages_project ON messages(project_id);
      CREATE INDEX IF NOT EXISTS idx_cost_project ON cost_tracking(project_id);
    `);
  }

  // ---------------------------------------------------------------------------
  // ProjectStore implementation
  // ---------------------------------------------------------------------------

  saveProject(project: Project): void {
    const upsertProject = this.db.prepare(`
      INSERT INTO projects (id, agenda, channel, phase, status, agent_ids, created_at, updated_at, completed_at, metadata)
      VALUES (@id, @agenda, @channel, @phase, @status, @agentIds, @createdAt, @updatedAt, @completedAt, @metadata)
      ON CONFLICT(id) DO UPDATE SET
        agenda = excluded.agenda,
        channel = excluded.channel,
        phase = excluded.phase,
        status = excluded.status,
        agent_ids = excluded.agent_ids,
        updated_at = excluded.updated_at,
        completed_at = excluded.completed_at,
        metadata = excluded.metadata
    `);

    const upsertTask = this.db.prepare(`
      INSERT INTO tasks (id, project_id, title, description, assigned_to, phase, status, created_at, completed_at, result)
      VALUES (@id, @projectId, @title, @description, @assignedTo, @phase, @status, @createdAt, @completedAt, @result)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        description = excluded.description,
        assigned_to = excluded.assigned_to,
        phase = excluded.phase,
        status = excluded.status,
        completed_at = excluded.completed_at,
        result = excluded.result
    `);

    const upsertMessage = this.db.prepare(`
      INSERT OR IGNORE INTO messages (id, project_id, agent_id, channel, content, phase, timestamp, reply_to_id, metadata)
      VALUES (@id, @projectId, @agentId, @channel, @content, @phase, @timestamp, @replyToId, @metadata)
    `);

    const saveAll = this.db.transaction(() => {
      upsertProject.run({
        id: project.id,
        agenda: project.agenda,
        channel: project.channel,
        phase: project.phase,
        status: project.status,
        agentIds: JSON.stringify(project.agentIds),
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        completedAt: project.completedAt?.toISOString() ?? null,
        metadata: project.metadata !== undefined ? JSON.stringify(project.metadata) : null,
      });

      for (const task of project.tasks) {
        upsertTask.run({
          id: task.id,
          projectId: project.id,
          title: task.title,
          description: task.description,
          assignedTo: task.assignedTo ?? null,
          phase: task.phase,
          status: task.status,
          createdAt: task.createdAt.toISOString(),
          completedAt: task.completedAt?.toISOString() ?? null,
          result: task.result !== undefined ? JSON.stringify(task.result) : null,
        });
      }

      for (const msg of project.messages) {
        upsertMessage.run({
          id: msg.id,
          projectId: project.id,
          agentId: msg.agentId,
          channel: msg.channel,
          content: msg.content,
          phase: msg.phase,
          timestamp: msg.timestamp.toISOString(),
          replyToId: msg.replyToId ?? null,
          metadata: msg.metadata !== undefined ? JSON.stringify(msg.metadata) : null,
        });
      }
    });

    saveAll();
  }

  getProject(id: string): Project | undefined {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
    if (row === undefined) return undefined;
    return this._hydrateProject(row);
  }

  getAllProjects(): Project[] {
    const rows = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as ProjectRow[];
    return rows.map((row) => this._hydrateProject(row));
  }

  deleteProject(id: string): void {
    this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
  }

  // ---------------------------------------------------------------------------
  // Cost tracking
  // ---------------------------------------------------------------------------

  saveCostEntry(entry: CostEntry): void {
    this.db.prepare(`
      INSERT INTO cost_tracking (id, project_id, agent_id, model, provider, input_tokens, output_tokens, total_tokens, cost, recorded_at)
      VALUES (@id, @projectId, @agentId, @model, @provider, @inputTokens, @outputTokens, @totalTokens, @cost, @recordedAt)
    `).run({
      id: entry.id,
      projectId: entry.projectId,
      agentId: entry.agentId,
      model: entry.model,
      provider: entry.provider,
      inputTokens: entry.inputTokens,
      outputTokens: entry.outputTokens,
      totalTokens: entry.totalTokens,
      cost: entry.cost,
      recordedAt: entry.recordedAt.toISOString(),
    });
  }

  getCostByProject(projectId: string): CostEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM cost_tracking WHERE project_id = ? ORDER BY recorded_at ASC')
      .all(projectId) as CostRow[];
    return rows.map(this._hydrateCostEntry);
  }

  getTotalCost(): number {
    const row = this.db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM cost_tracking').get() as { total: number };
    return row.total;
  }

  close(): void {
    this.db.close();
  }

  // ---------------------------------------------------------------------------
  // Hydration helpers
  // ---------------------------------------------------------------------------

  private _hydrateProject(row: ProjectRow): Project {
    const tasks = this.db
      .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
      .all(row.id) as TaskRow[];

    const messages = this.db
      .prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY timestamp ASC')
      .all(row.id) as MessageRow[];

    return {
      id: row.id,
      agenda: row.agenda,
      channel: row.channel,
      phase: row.phase as Project['phase'],
      status: row.status as Project['status'],
      agentIds: JSON.parse(row.agent_ids) as string[],
      tasks: tasks.map(this._hydrateTask),
      messages: messages.map(this._hydrateMessage),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : undefined,
      metadata: row.metadata !== null ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    };
  }

  private _hydrateTask(row: TaskRow): Task {
    return {
      id: row.id,
      projectId: row.project_id,
      title: row.title,
      description: row.description,
      assignedTo: row.assigned_to ?? undefined,
      phase: row.phase as Task['phase'],
      status: row.status as Task['status'],
      createdAt: new Date(row.created_at),
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : undefined,
      result: row.result !== null ? (JSON.parse(row.result) as unknown) : undefined,
    };
  }

  private _hydrateMessage(row: MessageRow): Message {
    return {
      id: row.id,
      projectId: row.project_id,
      agentId: row.agent_id,
      channel: row.channel,
      content: row.content,
      phase: row.phase as Message['phase'],
      timestamp: new Date(row.timestamp),
      replyToId: row.reply_to_id ?? undefined,
      metadata: row.metadata !== null ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    };
  }

  private _hydrateCostEntry(row: CostRow): CostEntry {
    return {
      id: row.id,
      projectId: row.project_id,
      agentId: row.agent_id,
      model: row.model,
      provider: row.provider,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      totalTokens: row.total_tokens,
      cost: row.cost,
      recordedAt: new Date(row.recorded_at),
    };
  }
}

// ---------------------------------------------------------------------------
// Raw DB row types
// ---------------------------------------------------------------------------

interface ProjectRow {
  id: string;
  agenda: string;
  channel: string;
  phase: string;
  status: string;
  agent_ids: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  metadata: string | null;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  description: string;
  assigned_to: string | null;
  phase: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  result: string | null;
}

interface MessageRow {
  id: string;
  project_id: string;
  agent_id: string;
  channel: string;
  content: string;
  phase: string;
  timestamp: string;
  reply_to_id: string | null;
  metadata: string | null;
}

interface CostRow {
  id: string;
  project_id: string;
  agent_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  recorded_at: string;
}

// ---------------------------------------------------------------------------
// InMemoryProjectStore — for tests
// ---------------------------------------------------------------------------

export class InMemoryProjectStore implements ProjectStore {
  private readonly store = new Map<string, Project>();

  saveProject(project: Project): void {
    this.store.set(project.id, { ...project });
  }

  getProject(id: string): Project | undefined {
    const p = this.store.get(id);
    return p !== undefined ? { ...p } : undefined;
  }

  getAllProjects(): Project[] {
    return Array.from(this.store.values()).map((p) => ({ ...p }));
  }

  deleteProject(id: string): void {
    this.store.delete(id);
  }
}
