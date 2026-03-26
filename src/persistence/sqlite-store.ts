import type BetterSqlite3 from 'better-sqlite3';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname } from 'path';
import { createRequire } from 'module';
import type {
  ApprovalRequestRecord,
  Project,
  Run,
  RunEvent,
  RuntimeArtifact,
  RunStatus,
  RunStep,
  RunStepStatus,
} from '../core/types.js';
import type { Message, Task } from '../core/types.js';
import type { CostEntry, ProjectStore, RuntimeCostSummary } from './types.js';

type BetterSqlite3Module = typeof import('better-sqlite3');

const require = createRequire(import.meta.url);

function loadBetterSqlite3(): BetterSqlite3Module | undefined {
  try {
    return require('better-sqlite3') as BetterSqlite3Module;
  } catch {
    return undefined;
  }
}

interface JsonFallbackState {
  projects: Project[];
  runs: Run[];
  steps: RunStep[];
  events: RunEvent[];
  artifacts: RuntimeArtifact[];
  approvals: ApprovalRequestRecord[];
  costs: CostEntry[];
}

interface FallbackStoreState {
  path: string;
  projects: Map<string, Project>;
  runs: Map<string, Run>;
  steps: Map<string, RunStep>;
  events: RunEvent[];
  artifacts: RuntimeArtifact[];
  approvals: Map<string, ApprovalRequestRecord>;
  costs: CostEntry[];
}

const EMPTY_FALLBACK_STATE: JsonFallbackState = {
  projects: [],
  runs: [],
  steps: [],
  events: [],
  artifacts: [],
  approvals: [],
  costs: [],
};

function cloneProject(project: Project): Project {
  return {
    ...project,
    agentIds: [...project.agentIds],
    tasks: project.tasks.map((task) => ({ ...task })),
    messages: project.messages.map((message) => ({ ...message })),
    metadata: project.metadata !== undefined ? { ...project.metadata } : undefined,
  };
}

function cloneRun(run: Run): Run {
  return {
    ...run,
    budget: run.budget !== undefined ? { ...run.budget } : undefined,
    metadata: run.metadata !== undefined ? { ...run.metadata } : undefined,
  };
}

function cloneRunStep(step: RunStep): RunStep {
  return {
    ...step,
    assignedRoles: [...step.assignedRoles],
    actionBatch: step.actionBatch !== undefined
      ? {
          ...step.actionBatch,
          actions: step.actionBatch.actions.map((action) => ({
            ...action,
            permissions: action.permissions !== undefined ? [...action.permissions] : undefined,
            filePaths: action.filePaths !== undefined ? [...action.filePaths] : undefined,
            payload: action.payload !== undefined ? { ...action.payload } : undefined,
            toolInput: action.toolInput !== undefined ? { ...action.toolInput } : undefined,
          })),
          blastRadius: {
            permissions: [...step.actionBatch.blastRadius.permissions],
            filePaths: [...step.actionBatch.blastRadius.filePaths],
            externalEffects: [...step.actionBatch.blastRadius.externalEffects],
          },
        }
      : undefined,
    checkpoint: step.checkpoint !== undefined ? { ...step.checkpoint } : undefined,
    metadata: step.metadata !== undefined ? { ...step.metadata } : undefined,
  };
}

function cloneRunEvent(event: RunEvent): RunEvent {
  return {
    ...event,
    payload: event.payload !== undefined ? { ...event.payload } : undefined,
  };
}

function cloneRuntimeArtifact(artifact: RuntimeArtifact): RuntimeArtifact {
  return {
    ...artifact,
  };
}

function cloneApproval(record: ApprovalRequestRecord): ApprovalRequestRecord {
  return {
    ...record,
    actionBatch: record.actionBatch !== undefined
      ? {
          ...record.actionBatch,
          actions: record.actionBatch.actions.map((action) => ({
            ...action,
            permissions: action.permissions !== undefined ? [...action.permissions] : undefined,
            filePaths: action.filePaths !== undefined ? [...action.filePaths] : undefined,
            payload: action.payload !== undefined ? { ...action.payload } : undefined,
            toolInput: action.toolInput !== undefined ? { ...action.toolInput } : undefined,
          })),
          blastRadius: {
            permissions: [...record.actionBatch.blastRadius.permissions],
            filePaths: [...record.actionBatch.blastRadius.filePaths],
            externalEffects: [...record.actionBatch.blastRadius.externalEffects],
          },
        }
      : undefined,
  };
}

function cloneCostEntry(entry: CostEntry): CostEntry {
  return { ...entry };
}

function serializeFallbackState(state: FallbackStoreState): JsonFallbackState {
  return {
    projects: Array.from(state.projects.values()).map(cloneProject),
    runs: Array.from(state.runs.values()).map(cloneRun),
    steps: Array.from(state.steps.values()).map(cloneRunStep),
    events: state.events.map(cloneRunEvent),
    artifacts: state.artifacts.map(cloneRuntimeArtifact),
    approvals: Array.from(state.approvals.values()).map(cloneApproval),
    costs: state.costs.map(cloneCostEntry),
  };
}

function hydrateFallbackState(filePath: string): FallbackStoreState {
  const raw = existsSync(filePath)
    ? (JSON.parse(readFileSync(filePath, 'utf-8')) as JsonFallbackState)
    : EMPTY_FALLBACK_STATE;

  return {
    path: filePath,
    projects: new Map(raw.projects.map((project) => [project.id, hydrateProject(project)])),
    runs: new Map(raw.runs.map((run) => [run.id, hydrateRun(run)])),
    steps: new Map(raw.steps.map((step) => [step.id, hydrateRunStep(step)])),
    events: raw.events.map(hydrateRunEvent),
    artifacts: raw.artifacts.map(hydrateRuntimeArtifact),
    approvals: new Map(raw.approvals.map((record) => [record.id, hydrateApproval(record)])),
    costs: raw.costs.map(hydrateCostEntry),
  };
}

function persistFallbackState(state: FallbackStoreState): void {
  writeFileSync(state.path, JSON.stringify(serializeFallbackState(state), null, 2), 'utf-8');
}

function hydrateProject(project: Project): Project {
  return {
    ...project,
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    completedAt: project.completedAt !== undefined ? new Date(project.completedAt) : undefined,
    tasks: project.tasks.map((task) => ({
      ...task,
      createdAt: new Date(task.createdAt),
      completedAt: task.completedAt !== undefined ? new Date(task.completedAt) : undefined,
    })),
    messages: project.messages.map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
    })),
  };
}

function hydrateRun(run: Run): Run {
  return {
    ...run,
    createdAt: new Date(run.createdAt),
    updatedAt: new Date(run.updatedAt),
    completedAt: run.completedAt !== undefined ? new Date(run.completedAt) : undefined,
  };
}

function hydrateRunStep(step: RunStep): RunStep {
  return {
    ...step,
    startedAt: step.startedAt !== undefined ? new Date(step.startedAt) : undefined,
    completedAt: step.completedAt !== undefined ? new Date(step.completedAt) : undefined,
  };
}

function hydrateRunEvent(event: RunEvent): RunEvent {
  return {
    ...event,
    createdAt: new Date(event.createdAt),
  };
}

function hydrateRuntimeArtifact(artifact: RuntimeArtifact): RuntimeArtifact {
  return {
    ...artifact,
    createdAt: new Date(artifact.createdAt),
  };
}

function hydrateApproval(record: ApprovalRequestRecord): ApprovalRequestRecord {
  return {
    ...record,
    requestedAt: new Date(record.requestedAt),
    respondedAt: record.respondedAt !== undefined ? new Date(record.respondedAt) : undefined,
  };
}

function hydrateCostEntry(entry: CostEntry): CostEntry {
  return {
    ...entry,
    recordedAt: new Date(entry.recordedAt),
  };
}

export class SqliteProjectStore implements ProjectStore {
  private readonly db: BetterSqlite3.Database | undefined;
  private readonly fallback: FallbackStoreState | undefined;

  constructor(dbPath: string = './data/clawcrew.db') {
    mkdirSync(dirname(dbPath), { recursive: true });
    const BetterSqlite = loadBetterSqlite3();

    if (BetterSqlite !== undefined) {
      try {
        this.db = new BetterSqlite(dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');
        this._createTables();
        this._ensureColumns();
        return;
      } catch {
      }
    }

    this.fallback = hydrateFallbackState(`${dbPath}.fallback.json`);
  }

  private _createTables(): void {
    if (this.db === undefined) return;

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

      CREATE TABLE IF NOT EXISTS runtime_artifacts (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        run_id TEXT,
        step_id TEXT,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS runs (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        agenda TEXT NOT NULL,
        channel TEXT NOT NULL,
        thread_id TEXT,
        source TEXT NOT NULL,
        mode TEXT NOT NULL,
        autonomy TEXT NOT NULL,
        status TEXT NOT NULL,
        current_step_id TEXT,
        requested_by TEXT,
        error TEXT,
        budget_json TEXT,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        completed_at TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS run_steps (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_key TEXT NOT NULL,
        title TEXT NOT NULL,
        phase TEXT NOT NULL,
        status TEXT NOT NULL,
        sequence_no INTEGER NOT NULL,
        assigned_roles_json TEXT NOT NULL,
        action_batch_json TEXT,
        checkpoint_json TEXT,
        result_summary TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        started_at TEXT,
        completed_at TEXT,
        metadata_json TEXT,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT,
        event_type TEXT NOT NULL,
        message TEXT NOT NULL,
        payload_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS approval_requests (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        step_id TEXT NOT NULL,
        project_id TEXT NOT NULL,
        phase TEXT NOT NULL,
        channel TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT NOT NULL,
        timeout_ms INTEGER NOT NULL,
        action_batch_json TEXT,
        requested_at TEXT NOT NULL,
        responded_at TEXT,
        approved_by TEXT,
        comment TEXT,
        FOREIGN KEY (run_id) REFERENCES runs(id) ON DELETE CASCADE,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS cost_tracking (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        run_id TEXT,
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
      CREATE INDEX IF NOT EXISTS idx_runs_project ON runs(project_id);
      CREATE INDEX IF NOT EXISTS idx_run_steps_run ON run_steps(run_id, sequence_no);
      CREATE INDEX IF NOT EXISTS idx_run_events_run ON run_events(run_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_approval_run ON approval_requests(run_id);
      CREATE INDEX IF NOT EXISTS idx_cost_project ON cost_tracking(project_id);
      CREATE INDEX IF NOT EXISTS idx_cost_run ON cost_tracking(run_id);
    `);
  }

  private _ensureColumns(): void {
    if (this.db === undefined) return;

    const columns = this.db.prepare("PRAGMA table_info(cost_tracking)").all() as Array<{ name: string }>;
    if (!columns.some((column) => column.name === 'run_id')) {
      this.db.exec('ALTER TABLE cost_tracking ADD COLUMN run_id TEXT');
    }
  }

  saveProject(project: Project): void {
    if (this.db !== undefined) {
      this._saveProjectSql(project);
      return;
    }

    const fallback = this.requireFallback();
    fallback.projects.set(project.id, cloneProject(project));
    persistFallbackState(fallback);
  }

  getProject(id: string): Project | undefined {
    if (this.db !== undefined) {
      const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
      return row !== undefined ? this._hydrateProject(row) : undefined;
    }

    const fallback = this.requireFallback();
    const project = fallback.projects.get(id);
    return project !== undefined ? cloneProject(project) : undefined;
  }

  getAllProjects(): Project[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all() as ProjectRow[];
      return rows.map((row) => this._hydrateProject(row));
    }

    const fallback = this.requireFallback();
    return Array.from(fallback.projects.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(cloneProject);
  }

  deleteProject(id: string): void {
    if (this.db !== undefined) {
      this.db.prepare('DELETE FROM projects WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM runs WHERE project_id = ?').run(id);
      this.db.prepare('DELETE FROM runtime_artifacts WHERE project_id = ?').run(id);
      this.db.prepare('DELETE FROM cost_tracking WHERE project_id = ?').run(id);
      return;
    }

    const fallback = this.requireFallback();
    fallback.projects.delete(id);
    const runIds = Array.from(fallback.runs.values())
      .filter((run) => run.projectId === id)
      .map((run) => run.id);
    for (const runId of runIds) {
      fallback.runs.delete(runId);
      for (const [stepId, step] of fallback.steps) {
        if (step.runId === runId) fallback.steps.delete(stepId);
      }
      fallback.events = fallback.events.filter((event) => event.runId !== runId);
      fallback.artifacts = fallback.artifacts.filter((artifact) => artifact.runId !== runId);
      for (const [approvalId, approval] of fallback.approvals) {
        if (approval.runId === runId) fallback.approvals.delete(approvalId);
      }
      fallback.costs = fallback.costs.filter((entry) => entry.projectId !== id);
    }
    persistFallbackState(fallback);
  }

  saveRun(run: Run): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT INTO runs (
          id, project_id, agenda, channel, thread_id, source, mode, autonomy, status,
          current_step_id, requested_by, error, budget_json, metadata_json,
          created_at, updated_at, completed_at
        ) VALUES (
          @id, @projectId, @agenda, @channel, @threadId, @source, @mode, @autonomy, @status,
          @currentStepId, @requestedBy, @error, @budgetJson, @metadataJson,
          @createdAt, @updatedAt, @completedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          project_id = excluded.project_id,
          agenda = excluded.agenda,
          channel = excluded.channel,
          thread_id = excluded.thread_id,
          source = excluded.source,
          mode = excluded.mode,
          autonomy = excluded.autonomy,
          status = excluded.status,
          current_step_id = excluded.current_step_id,
          requested_by = excluded.requested_by,
          error = excluded.error,
          budget_json = excluded.budget_json,
          metadata_json = excluded.metadata_json,
          updated_at = excluded.updated_at,
          completed_at = excluded.completed_at
      `).run({
        id: run.id,
        projectId: run.projectId,
        agenda: run.agenda,
        channel: run.channel,
        threadId: run.threadId ?? null,
        source: run.source,
        mode: run.mode,
        autonomy: run.autonomy,
        status: run.status,
        currentStepId: run.currentStepId ?? null,
        requestedBy: run.requestedBy ?? null,
        error: run.error ?? null,
        budgetJson: run.budget !== undefined ? JSON.stringify(run.budget) : null,
        metadataJson: run.metadata !== undefined ? JSON.stringify(run.metadata) : null,
        createdAt: run.createdAt.toISOString(),
        updatedAt: run.updatedAt.toISOString(),
        completedAt: run.completedAt?.toISOString() ?? null,
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.runs.set(run.id, cloneRun(run));
    persistFallbackState(fallback);
  }

  getRun(id: string): Run | undefined {
    if (this.db !== undefined) {
      const row = this.db.prepare('SELECT * FROM runs WHERE id = ?').get(id) as RunRow | undefined;
      return row !== undefined ? this._hydrateRun(row) : undefined;
    }

    const fallback = this.requireFallback();
    const run = fallback.runs.get(id);
    return run !== undefined ? cloneRun(run) : undefined;
  }

  getRunsByProject(projectId: string): Run[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM runs WHERE project_id = ? ORDER BY created_at DESC').all(projectId) as RunRow[];
      return rows.map((row) => this._hydrateRun(row));
    }

    const fallback = this.requireFallback();
    return Array.from(fallback.runs.values())
      .filter((run) => run.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(cloneRun);
  }

  getAllRuns(): Run[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM runs ORDER BY created_at DESC').all() as RunRow[];
      return rows.map((row) => this._hydrateRun(row));
    }

    const fallback = this.requireFallback();
    return Array.from(fallback.runs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map(cloneRun);
  }

  updateRunStatus(id: string, status: RunStatus, error?: string): void {
    const run = this.getRun(id);
    if (run === undefined) return;

    const now = new Date();
    run.status = status;
    run.updatedAt = now;
    run.error = error;
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      run.completedAt = now;
    }
    this.saveRun(run);
  }

  saveRunStep(step: RunStep): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT INTO run_steps (
          id, run_id, step_key, title, phase, status, sequence_no, assigned_roles_json,
          action_batch_json, checkpoint_json, result_summary, retry_count, started_at,
          completed_at, metadata_json
        ) VALUES (
          @id, @runId, @stepKey, @title, @phase, @status, @sequence,
          @assignedRolesJson, @actionBatchJson, @checkpointJson, @resultSummary,
          @retryCount, @startedAt, @completedAt, @metadataJson
        )
        ON CONFLICT(id) DO UPDATE SET
          run_id = excluded.run_id,
          step_key = excluded.step_key,
          title = excluded.title,
          phase = excluded.phase,
          status = excluded.status,
          sequence_no = excluded.sequence_no,
          assigned_roles_json = excluded.assigned_roles_json,
          action_batch_json = excluded.action_batch_json,
          checkpoint_json = excluded.checkpoint_json,
          result_summary = excluded.result_summary,
          retry_count = excluded.retry_count,
          started_at = excluded.started_at,
          completed_at = excluded.completed_at,
          metadata_json = excluded.metadata_json
      `).run({
        id: step.id,
        runId: step.runId,
        stepKey: step.key,
        title: step.title,
        phase: step.phase,
        status: step.status,
        sequence: step.sequence,
        assignedRolesJson: JSON.stringify(step.assignedRoles),
        actionBatchJson: step.actionBatch !== undefined ? JSON.stringify(step.actionBatch) : null,
        checkpointJson: step.checkpoint !== undefined ? JSON.stringify(step.checkpoint) : null,
        resultSummary: step.resultSummary ?? null,
        retryCount: step.retryCount,
        startedAt: step.startedAt?.toISOString() ?? null,
        completedAt: step.completedAt?.toISOString() ?? null,
        metadataJson: step.metadata !== undefined ? JSON.stringify(step.metadata) : null,
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.steps.set(step.id, cloneRunStep(step));
    persistFallbackState(fallback);
  }

  getRunSteps(runId: string): RunStep[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM run_steps WHERE run_id = ? ORDER BY sequence_no ASC').all(runId) as RunStepRow[];
      return rows.map((row) => this._hydrateRunStep(row));
    }

    const fallback = this.requireFallback();
    return Array.from(fallback.steps.values())
      .filter((step) => step.runId === runId)
      .sort((a, b) => a.sequence - b.sequence)
      .map(cloneRunStep);
  }

  updateRunStepStatus(stepId: string, status: RunStepStatus, patch?: Partial<RunStep>): void {
    const step = this.getRunSteps(patch?.runId ?? this.getRunByStepId(stepId)?.id ?? '')
      .find((candidate) => candidate.id === stepId)
      ?? this.getRunStepById(stepId);
    if (step === undefined) return;

    const next: RunStep = {
      ...step,
      ...patch,
      status,
      assignedRoles: patch?.assignedRoles ?? step.assignedRoles,
    };
    this.saveRunStep(next);
  }

  getCurrentRunStep(runId: string): RunStep | undefined {
    const steps = this.getRunSteps(runId);
    return steps.find((step) => step.status === 'running' || step.status === 'waiting_approval' || step.status === 'queued')
      ?? steps.find((step) => step.status === 'pending');
  }

  appendRunEvent(event: RunEvent): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT INTO run_events (id, run_id, step_id, event_type, message, payload_json, created_at)
        VALUES (@id, @runId, @stepId, @eventType, @message, @payloadJson, @createdAt)
      `).run({
        id: event.id,
        runId: event.runId,
        stepId: event.stepId ?? null,
        eventType: event.type,
        message: event.message,
        payloadJson: event.payload !== undefined ? JSON.stringify(event.payload) : null,
        createdAt: event.createdAt.toISOString(),
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.events.push(cloneRunEvent(event));
    persistFallbackState(fallback);
  }

  getRunEvents(runId: string, limit?: number): RunEvent[] {
    if (this.db !== undefined) {
      const rows = limit !== undefined
        ? this.db.prepare('SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at DESC LIMIT ?').all(runId, limit) as RunEventRow[]
        : this.db.prepare('SELECT * FROM run_events WHERE run_id = ? ORDER BY created_at ASC').all(runId) as RunEventRow[];
      const hydrated = rows.map((row) => this._hydrateRunEvent(row));
      return limit !== undefined ? hydrated.reverse() : hydrated;
    }

    const fallback = this.requireFallback();
    const events = fallback.events.filter((event) => event.runId === runId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return (limit !== undefined ? events.slice(-limit) : events).map(cloneRunEvent);
  }

  saveRuntimeArtifact(artifact: RuntimeArtifact): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT OR REPLACE INTO runtime_artifacts (id, project_id, run_id, step_id, name, type, content, created_at)
        VALUES (@id, @projectId, @runId, @stepId, @name, @type, @content, @createdAt)
      `).run({
        id: artifact.id,
        projectId: artifact.projectId,
        runId: artifact.runId,
        stepId: artifact.stepId ?? null,
        name: artifact.name,
        type: artifact.type,
        content: JSON.stringify(artifact.content),
        createdAt: artifact.createdAt.toISOString(),
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.artifacts = fallback.artifacts.filter((entry) => entry.id !== artifact.id);
    fallback.artifacts.push(cloneRuntimeArtifact(artifact));
    persistFallbackState(fallback);
  }

  getRuntimeArtifacts(runId: string, stepId?: string): RuntimeArtifact[] {
    if (this.db !== undefined) {
      const rows = stepId !== undefined
        ? this.db.prepare('SELECT * FROM runtime_artifacts WHERE run_id = ? AND step_id = ? ORDER BY created_at ASC').all(runId, stepId) as RuntimeArtifactRow[]
        : this.db.prepare('SELECT * FROM runtime_artifacts WHERE run_id = ? ORDER BY created_at ASC').all(runId) as RuntimeArtifactRow[];
      return rows.map((row) => this._hydrateRuntimeArtifact(row));
    }

    const fallback = this.requireFallback();
    return fallback.artifacts
      .filter((artifact) => artifact.runId === runId && (stepId === undefined || artifact.stepId === stepId))
      .map(cloneRuntimeArtifact);
  }

  saveApprovalRequest(request: ApprovalRequestRecord): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT INTO approval_requests (
          id, run_id, step_id, project_id, phase, channel, status, summary, timeout_ms,
          action_batch_json, requested_at, responded_at, approved_by, comment
        ) VALUES (
          @id, @runId, @stepId, @projectId, @phase, @channel, @status, @summary, @timeoutMs,
          @actionBatchJson, @requestedAt, @respondedAt, @approvedBy, @comment
        )
        ON CONFLICT(id) DO UPDATE SET
          run_id = excluded.run_id,
          step_id = excluded.step_id,
          project_id = excluded.project_id,
          phase = excluded.phase,
          channel = excluded.channel,
          status = excluded.status,
          summary = excluded.summary,
          timeout_ms = excluded.timeout_ms,
          action_batch_json = excluded.action_batch_json,
          requested_at = excluded.requested_at,
          responded_at = excluded.responded_at,
          approved_by = excluded.approved_by,
          comment = excluded.comment
      `).run({
        id: request.id,
        runId: request.runId,
        stepId: request.stepId,
        projectId: request.projectId,
        phase: request.phase,
        channel: request.channel,
        status: request.status,
        summary: request.summary,
        timeoutMs: request.timeoutMs,
        actionBatchJson: request.actionBatch !== undefined ? JSON.stringify(request.actionBatch) : null,
        requestedAt: request.requestedAt.toISOString(),
        respondedAt: request.respondedAt?.toISOString() ?? null,
        approvedBy: request.approvedBy ?? null,
        comment: request.comment ?? null,
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.approvals.set(request.id, cloneApproval(request));
    persistFallbackState(fallback);
  }

  getApprovalRequest(id: string): ApprovalRequestRecord | undefined {
    if (this.db !== undefined) {
      const row = this.db.prepare('SELECT * FROM approval_requests WHERE id = ?').get(id) as ApprovalRow | undefined;
      return row !== undefined ? this._hydrateApproval(row) : undefined;
    }

    const fallback = this.requireFallback();
    const record = fallback.approvals.get(id);
    return record !== undefined ? cloneApproval(record) : undefined;
  }

  getPendingApprovalForRun(runId: string): ApprovalRequestRecord | undefined {
    if (this.db !== undefined) {
      const row = this.db.prepare(
        'SELECT * FROM approval_requests WHERE run_id = ? AND status = ? ORDER BY requested_at DESC LIMIT 1',
      ).get(runId, 'pending') as ApprovalRow | undefined;
      return row !== undefined ? this._hydrateApproval(row) : undefined;
    }

    const fallback = this.requireFallback();
    const record = Array.from(fallback.approvals.values())
      .filter((approval) => approval.runId === runId && approval.status === 'pending')
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0];
    return record !== undefined ? cloneApproval(record) : undefined;
  }

  resolveApprovalRequest(
    id: string,
    patch: Pick<ApprovalRequestRecord, 'status' | 'respondedAt' | 'approvedBy' | 'comment'>,
  ): ApprovalRequestRecord | undefined {
    const existing = this.getApprovalRequest(id);
    if (existing === undefined) return undefined;
    const next: ApprovalRequestRecord = { ...existing, ...patch };
    this.saveApprovalRequest(next);
    return next;
  }

  saveCostEntry(entry: CostEntry): void {
    if (this.db !== undefined) {
      this.db.prepare(`
        INSERT INTO cost_tracking (id, project_id, run_id, agent_id, model, provider, input_tokens, output_tokens, total_tokens, cost, recorded_at)
        VALUES (@id, @projectId, @runId, @agentId, @model, @provider, @inputTokens, @outputTokens, @totalTokens, @cost, @recordedAt)
      `).run({
        id: entry.id,
        projectId: entry.projectId,
        runId: entry.runId ?? null,
        agentId: entry.agentId,
        model: entry.model,
        provider: entry.provider,
        inputTokens: entry.inputTokens,
        outputTokens: entry.outputTokens,
        totalTokens: entry.totalTokens,
        cost: entry.cost,
        recordedAt: entry.recordedAt.toISOString(),
      });
      return;
    }

    const fallback = this.requireFallback();
    fallback.costs.push(cloneCostEntry(entry));
    persistFallbackState(fallback);
  }

  getCostByProject(projectId: string): CostEntry[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM cost_tracking WHERE project_id = ? ORDER BY recorded_at ASC').all(projectId) as CostRow[];
      return rows.map((row) => this._hydrateCostEntry(row));
    }

    const fallback = this.requireFallback();
    return fallback.costs.filter((entry) => entry.projectId === projectId).map(cloneCostEntry);
  }

  getCostByRun(runId: string): CostEntry[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM cost_tracking WHERE run_id = ? ORDER BY recorded_at ASC').all(runId) as CostRow[];
      return rows.map((row) => this._hydrateCostEntry(row));
    }

    const fallback = this.requireFallback();
    return fallback.costs.filter((entry) => entry.runId === runId).map(cloneCostEntry);
  }

  getTotalCost(): number {
    if (this.db !== undefined) {
      const row = this.db.prepare('SELECT COALESCE(SUM(cost), 0) as total FROM cost_tracking').get() as { total: number };
      return row.total;
    }

    const fallback = this.requireFallback();
    return fallback.costs.reduce((sum, entry) => sum + entry.cost, 0);
  }

  getCostSummary(projectId?: string, runId?: string): RuntimeCostSummary {
    const entries = runId !== undefined
      ? this.getCostByRun(runId)
      : projectId !== undefined
        ? this.getCostByProject(projectId)
        : this.getAllCostEntries();

    const byModel: Record<string, number> = {};
    const byAgent: Record<string, number> = {};

    for (const entry of entries) {
      byModel[entry.model] = (byModel[entry.model] ?? 0) + entry.totalTokens;
      byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + entry.cost;
    }

    return {
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      requestCount: entries.length,
      byModel,
      byAgent,
    };
  }

  close(): void {
    if (this.db !== undefined) {
      this.db.close();
      return;
    }

    if (this.fallback !== undefined) {
      persistFallbackState(this.fallback);
    }
  }

  private _saveProjectSql(project: Project): void {
    if (this.db === undefined) return;

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

      for (const message of project.messages) {
        upsertMessage.run({
          id: message.id,
          projectId: project.id,
          agentId: message.agentId,
          channel: message.channel,
          content: message.content,
          phase: message.phase,
          timestamp: message.timestamp.toISOString(),
          replyToId: message.replyToId ?? null,
          metadata: message.metadata !== undefined ? JSON.stringify(message.metadata) : null,
        });
      }
    });

    saveAll();
  }

  private _hydrateProject(row: ProjectRow): Project {
    if (this.db === undefined) {
      throw new Error('SQLite backend unavailable');
    }

    const tasks = this.db.prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC').all(row.id) as TaskRow[];
    const messages = this.db.prepare('SELECT * FROM messages WHERE project_id = ? ORDER BY timestamp ASC').all(row.id) as MessageRow[];

    return {
      id: row.id,
      agenda: row.agenda,
      channel: row.channel,
      phase: row.phase as Project['phase'],
      status: row.status as Project['status'],
      agentIds: JSON.parse(row.agent_ids) as string[],
      tasks: tasks.map((task) => this._hydrateTask(task)),
      messages: messages.map((message) => this._hydrateMessage(message)),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : undefined,
      metadata: row.metadata !== null ? (JSON.parse(row.metadata) as Record<string, unknown>) : undefined,
    };
  }

  private _hydrateRun(row: RunRow): Run {
    return {
      id: row.id,
      projectId: row.project_id,
      agenda: row.agenda,
      channel: row.channel,
      threadId: row.thread_id ?? undefined,
      source: row.source as Run['source'],
      mode: row.mode as Run['mode'],
      autonomy: row.autonomy as Run['autonomy'],
      status: row.status as Run['status'],
      currentStepId: row.current_step_id ?? undefined,
      requestedBy: row.requested_by ?? undefined,
      error: row.error ?? undefined,
      budget: row.budget_json !== null ? (JSON.parse(row.budget_json) as Run['budget']) : undefined,
      metadata: row.metadata_json !== null ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : undefined,
    };
  }

  private _hydrateRunStep(row: RunStepRow): RunStep {
    return {
      id: row.id,
      runId: row.run_id,
      key: row.step_key,
      title: row.title,
      phase: row.phase as RunStep['phase'],
      status: row.status as RunStep['status'],
      sequence: row.sequence_no,
      assignedRoles: JSON.parse(row.assigned_roles_json) as RunStep['assignedRoles'],
      actionBatch: row.action_batch_json !== null ? (JSON.parse(row.action_batch_json) as RunStep['actionBatch']) : undefined,
      checkpoint: row.checkpoint_json !== null ? (JSON.parse(row.checkpoint_json) as RunStep['checkpoint']) : undefined,
      resultSummary: row.result_summary ?? undefined,
      retryCount: row.retry_count,
      startedAt: row.started_at !== null ? new Date(row.started_at) : undefined,
      completedAt: row.completed_at !== null ? new Date(row.completed_at) : undefined,
      metadata: row.metadata_json !== null ? (JSON.parse(row.metadata_json) as Record<string, unknown>) : undefined,
    };
  }

  private _hydrateRunEvent(row: RunEventRow): RunEvent {
    return {
      id: row.id,
      runId: row.run_id,
      stepId: row.step_id ?? undefined,
      type: row.event_type,
      message: row.message,
      payload: row.payload_json !== null ? (JSON.parse(row.payload_json) as Record<string, unknown>) : undefined,
      createdAt: new Date(row.created_at),
    };
  }

  private _hydrateRuntimeArtifact(row: RuntimeArtifactRow): RuntimeArtifact {
    return {
      id: row.id,
      projectId: row.project_id,
      runId: row.run_id,
      stepId: row.step_id ?? undefined,
      name: row.name,
      type: row.type,
      content: JSON.parse(row.content),
      createdAt: new Date(row.created_at),
    };
  }

  private _hydrateApproval(row: ApprovalRow): ApprovalRequestRecord {
    return {
      id: row.id,
      runId: row.run_id,
      stepId: row.step_id,
      projectId: row.project_id,
      phase: row.phase as ApprovalRequestRecord['phase'],
      channel: row.channel,
      status: row.status as ApprovalRequestRecord['status'],
      summary: row.summary,
      timeoutMs: row.timeout_ms,
      actionBatch: row.action_batch_json !== null ? (JSON.parse(row.action_batch_json) as ApprovalRequestRecord['actionBatch']) : undefined,
      requestedAt: new Date(row.requested_at),
      respondedAt: row.responded_at !== null ? new Date(row.responded_at) : undefined,
      approvedBy: row.approved_by ?? undefined,
      comment: row.comment ?? undefined,
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
      runId: row.run_id ?? undefined,
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

  private getRunStepById(stepId: string): RunStep | undefined {
    if (this.db !== undefined) {
      const row = this.db.prepare('SELECT * FROM run_steps WHERE id = ?').get(stepId) as RunStepRow | undefined;
      return row !== undefined ? this._hydrateRunStep(row) : undefined;
    }

    const fallback = this.requireFallback();
    const step = fallback.steps.get(stepId);
    return step !== undefined ? cloneRunStep(step) : undefined;
  }

  private getRunByStepId(stepId: string): Run | undefined {
    const step = this.getRunStepById(stepId);
    return step !== undefined ? this.getRun(step.runId) : undefined;
  }

  private getAllCostEntries(): CostEntry[] {
    if (this.db !== undefined) {
      const rows = this.db.prepare('SELECT * FROM cost_tracking ORDER BY recorded_at ASC').all() as CostRow[];
      return rows.map((row) => this._hydrateCostEntry(row));
    }

    return this.requireFallback().costs.map(cloneCostEntry);
  }

  private requireFallback(): FallbackStoreState {
    if (this.fallback === undefined) {
      throw new Error('Fallback store unavailable');
    }
    return this.fallback;
  }
}

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

interface RunRow {
  id: string;
  project_id: string;
  agenda: string;
  channel: string;
  thread_id: string | null;
  source: string;
  mode: string;
  autonomy: string;
  status: string;
  current_step_id: string | null;
  requested_by: string | null;
  error: string | null;
  budget_json: string | null;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface RunStepRow {
  id: string;
  run_id: string;
  step_key: string;
  title: string;
  phase: string;
  status: string;
  sequence_no: number;
  assigned_roles_json: string;
  action_batch_json: string | null;
  checkpoint_json: string | null;
  result_summary: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  metadata_json: string | null;
}

interface RunEventRow {
  id: string;
  run_id: string;
  step_id: string | null;
  event_type: string;
  message: string;
  payload_json: string | null;
  created_at: string;
}

interface RuntimeArtifactRow {
  id: string;
  project_id: string;
  run_id: string;
  step_id: string | null;
  name: string;
  type: string;
  content: string;
  created_at: string;
}

interface ApprovalRow {
  id: string;
  run_id: string;
  step_id: string;
  project_id: string;
  phase: string;
  channel: string;
  status: string;
  summary: string;
  timeout_ms: number;
  action_batch_json: string | null;
  requested_at: string;
  responded_at: string | null;
  approved_by: string | null;
  comment: string | null;
}

interface CostRow {
  id: string;
  project_id: string;
  run_id: string | null;
  agent_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost: number;
  recorded_at: string;
}

export class InMemoryProjectStore implements ProjectStore {
  private readonly projects = new Map<string, Project>();
  private readonly runs = new Map<string, Run>();
  private readonly steps = new Map<string, RunStep>();
  private readonly events: RunEvent[] = [];
  private readonly artifacts: RuntimeArtifact[] = [];
  private readonly approvals = new Map<string, ApprovalRequestRecord>();
  private readonly costs: CostEntry[] = [];

  saveProject(project: Project): void {
    this.projects.set(project.id, cloneProject(project));
  }

  getProject(id: string): Project | undefined {
    const project = this.projects.get(id);
    return project !== undefined ? cloneProject(project) : undefined;
  }

  getAllProjects(): Project[] {
    return Array.from(this.projects.values()).map(cloneProject);
  }

  deleteProject(id: string): void {
    this.projects.delete(id);
    const runIds = Array.from(this.runs.values()).filter((run) => run.projectId === id).map((run) => run.id);
    for (const runId of runIds) {
      this.runs.delete(runId);
      for (const [stepId, step] of this.steps) {
        if (step.runId === runId) this.steps.delete(stepId);
      }
      for (let index = this.events.length - 1; index >= 0; index -= 1) {
        if (this.events[index]?.runId === runId) this.events.splice(index, 1);
      }
      for (let index = this.artifacts.length - 1; index >= 0; index -= 1) {
        if (this.artifacts[index]?.runId === runId) this.artifacts.splice(index, 1);
      }
      for (const [approvalId, approval] of this.approvals) {
        if (approval.runId === runId) this.approvals.delete(approvalId);
      }
    }
    for (let index = this.costs.length - 1; index >= 0; index -= 1) {
      if (this.costs[index]?.projectId === id) this.costs.splice(index, 1);
    }
  }

  saveRun(run: Run): void {
    this.runs.set(run.id, cloneRun(run));
  }

  getRun(id: string): Run | undefined {
    const run = this.runs.get(id);
    return run !== undefined ? cloneRun(run) : undefined;
  }

  getRunsByProject(projectId: string): Run[] {
    return Array.from(this.runs.values()).filter((run) => run.projectId === projectId).map(cloneRun);
  }

  getAllRuns(): Run[] {
    return Array.from(this.runs.values()).map(cloneRun);
  }

  updateRunStatus(id: string, status: RunStatus, error?: string): void {
    const run = this.runs.get(id);
    if (run === undefined) return;
    run.status = status;
    run.error = error;
    run.updatedAt = new Date();
    if (status === 'completed' || status === 'failed' || status === 'cancelled') {
      run.completedAt = new Date();
    }
  }

  saveRunStep(step: RunStep): void {
    this.steps.set(step.id, cloneRunStep(step));
  }

  getRunSteps(runId: string): RunStep[] {
    return Array.from(this.steps.values()).filter((step) => step.runId === runId).sort((a, b) => a.sequence - b.sequence).map(cloneRunStep);
  }

  updateRunStepStatus(stepId: string, status: RunStepStatus, patch?: Partial<RunStep>): void {
    const step = this.steps.get(stepId);
    if (step === undefined) return;
    this.steps.set(stepId, cloneRunStep({ ...step, ...patch, status, assignedRoles: patch?.assignedRoles ?? step.assignedRoles }));
  }

  getCurrentRunStep(runId: string): RunStep | undefined {
    return this.getRunSteps(runId).find((step) => step.status === 'running' || step.status === 'waiting_approval' || step.status === 'queued')
      ?? this.getRunSteps(runId).find((step) => step.status === 'pending');
  }

  appendRunEvent(event: RunEvent): void {
    this.events.push(cloneRunEvent(event));
  }

  getRunEvents(runId: string, limit?: number): RunEvent[] {
    const events = this.events.filter((event) => event.runId === runId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return (limit !== undefined ? events.slice(-limit) : events).map(cloneRunEvent);
  }

  saveRuntimeArtifact(artifact: RuntimeArtifact): void {
    const index = this.artifacts.findIndex((entry) => entry.id === artifact.id);
    if (index >= 0) {
      this.artifacts.splice(index, 1, cloneRuntimeArtifact(artifact));
    } else {
      this.artifacts.push(cloneRuntimeArtifact(artifact));
    }
  }

  getRuntimeArtifacts(runId: string, stepId?: string): RuntimeArtifact[] {
    return this.artifacts
      .filter((artifact) => artifact.runId === runId && (stepId === undefined || artifact.stepId === stepId))
      .map(cloneRuntimeArtifact);
  }

  saveApprovalRequest(request: ApprovalRequestRecord): void {
    this.approvals.set(request.id, cloneApproval(request));
  }

  getApprovalRequest(id: string): ApprovalRequestRecord | undefined {
    const request = this.approvals.get(id);
    return request !== undefined ? cloneApproval(request) : undefined;
  }

  getPendingApprovalForRun(runId: string): ApprovalRequestRecord | undefined {
    const request = Array.from(this.approvals.values())
      .filter((approval) => approval.runId === runId && approval.status === 'pending')
      .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())[0];
    return request !== undefined ? cloneApproval(request) : undefined;
  }

  resolveApprovalRequest(id: string, patch: Pick<ApprovalRequestRecord, 'status' | 'respondedAt' | 'approvedBy' | 'comment'>): ApprovalRequestRecord | undefined {
    const request = this.approvals.get(id);
    if (request === undefined) return undefined;
    const next = { ...request, ...patch };
    this.approvals.set(id, cloneApproval(next));
    return cloneApproval(next);
  }

  saveCostEntry(entry: CostEntry): void {
    this.costs.push(cloneCostEntry(entry));
  }

  getCostByProject(projectId: string): CostEntry[] {
    return this.costs.filter((entry) => entry.projectId === projectId).map(cloneCostEntry);
  }

  getCostByRun(runId: string): CostEntry[] {
    return this.costs.filter((entry) => entry.runId === runId).map(cloneCostEntry);
  }

  getTotalCost(): number {
    return this.costs.reduce((sum, entry) => sum + entry.cost, 0);
  }

  getCostSummary(projectId?: string, runId?: string): RuntimeCostSummary {
    const entries = runId !== undefined
      ? this.getCostByRun(runId)
      : projectId !== undefined
        ? this.getCostByProject(projectId)
        : this.costs.map(cloneCostEntry);
    const byModel: Record<string, number> = {};
    const byAgent: Record<string, number> = {};
    for (const entry of entries) {
      byModel[entry.model] = (byModel[entry.model] ?? 0) + entry.totalTokens;
      byAgent[entry.agentId] = (byAgent[entry.agentId] ?? 0) + entry.cost;
    }
    return {
      totalCost: entries.reduce((sum, entry) => sum + entry.cost, 0),
      requestCount: entries.length,
      byModel,
      byAgent,
    };
  }

  close(): void {}
}
