import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrchestrationEngine } from '../../src/core/engine.js';
import { AgentRegistry } from '../../src/core/registry.js';
import type { AigoraConfig, Project, Run, RunStep } from '../../src/core/types.js';
import { Phase, RunMode, RunSource } from '../../src/core/types.js';
import { InMemoryProjectStore } from '../../src/persistence/sqlite-store.js';

const minimalConfig: AigoraConfig = {
  messengers: [],
  llm: { provider: 'anthropic', model: 'claude-3-haiku' },
  logLevel: 'error',
};

describe('OrchestrationEngine', () => {
  let engine: OrchestrationEngine;

  beforeEach(() => {
    AgentRegistry.reset();
    engine = new OrchestrationEngine(minimalConfig);
  });

  afterEach(async () => {
    // ensure engine is stopped even if a test fails mid-way
    await engine.stop().catch(() => undefined);
  });

  describe('start / stop lifecycle', () => {
    it('transitions running state from false to true after start()', async () => {
      expect(engine.getStatus().running).toBe(false);
      await engine.start();
      expect(engine.getStatus().running).toBe(true);
    });

    it('transitions running state back to false after stop()', async () => {
      await engine.start();
      await engine.stop();
      expect(engine.getStatus().running).toBe(false);
    });

    it('throws when start() is called on an already-running engine', async () => {
      await engine.start();
      await expect(engine.start()).rejects.toThrow(/already running/);
    });

    it('is a no-op when stop() is called on a stopped engine', async () => {
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    it('applies configured llm provider settings to the runtime environment', async () => {
      const previousProvider = process.env['LLM_PROVIDER'];
      const previousModel = process.env['LLM_MODEL'];
      const previousKey = process.env['OPENAI_API_KEY'];

      try {
        const configuredEngine = new OrchestrationEngine({
          ...minimalConfig,
          llm: { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'config-key' },
        });
        await configuredEngine.stop();
        expect(process.env['LLM_PROVIDER']).toBe('openai');
        expect(process.env['LLM_MODEL']).toBe('gpt-4o-mini');
        expect(process.env['OPENAI_API_KEY']).toBe('config-key');
      } finally {
        restoreEnv('LLM_PROVIDER', previousProvider);
        restoreEnv('LLM_MODEL', previousModel);
        restoreEnv('OPENAI_API_KEY', previousKey);
      }
    });
  });

  describe('submitAgenda', () => {
    it('returns a non-empty project id string', async () => {
      await engine.start();
      const id = await engine.submitAgenda('build a chat app', 'slack-channel');
      expect(typeof id).toBe('string');
      expect(id.length).toBeGreaterThan(0);
    });

    it('creates a project retrievable by the returned id', async () => {
      await engine.start();
      const id = await engine.submitAgenda('build a search engine', 'general');
      const project = engine.getProject(id);
      expect(project).toBeDefined();
      expect(project!.agenda).toBe('build a search engine');
      expect(project!.channel).toBe('general');
    });

    it('sets the initial project phase to RESEARCH', async () => {
      await engine.start();
      const id = await engine.submitAgenda('some agenda', 'ch');
      expect(engine.getProject(id)!.phase).toBe(Phase.RESEARCH);
    });

    it('increments projectCount in status', async () => {
      await engine.start();
      expect(engine.getStatus().projectCount).toBe(0);
      await engine.submitAgenda('agenda-1', 'ch');
      await engine.submitAgenda('agenda-2', 'ch');
      expect(engine.getStatus().projectCount).toBe(2);
    });

    it('throws when called before the engine is started', async () => {
      await expect(engine.submitAgenda('too early', 'ch')).rejects.toThrow(/not running/);
    });
  });

  describe('getStatus', () => {
    it('records startedAt when engine is running', async () => {
      await engine.start();
      const status = engine.getStatus();
      expect(status.startedAt).toBeInstanceOf(Date);
    });

    it('clears startedAt after stop()', async () => {
      await engine.start();
      await engine.stop();
      expect(engine.getStatus().startedAt).toBeUndefined();
    });
  });

  describe('durable run execution', () => {
    it('executes an approved action batch and stores runtime artifacts', async () => {
      const store = new InMemoryProjectStore();
      const durableEngine = new OrchestrationEngine(minimalConfig, store);
      await durableEngine.start();

      try {
        const run = await durableEngine.submitRun('build a small runtime change', 'local', { mode: RunMode.REVIEW });

        const waitingSummary = await waitFor(async () => durableEngine.getRunSummary(run.id), (summary) => summary?.pendingApproval !== undefined);
        expect(waitingSummary?.pendingApproval).toBeDefined();

        await durableEngine.approveRun(waitingSummary!.pendingApproval!.id, true, 'tester');

        const completedSummary = await waitFor(async () => durableEngine.getRunSummary(run.id), (summary) => summary?.run.status === 'completed');
        expect(completedSummary?.run.status).toBe('completed');
        expect(store.getRuntimeArtifacts(run.id).length).toBeGreaterThan(0);
      } finally {
        await durableEngine.stop();
      }
    });

    it('marks the run failed if an approved action batch cannot execute', async () => {
      const store = new InMemoryProjectStore();
      const now = new Date();
      const project: Project = {
        id: 'project-failure',
        agenda: 'failing action batch',
        channel: 'local',
        phase: Phase.CODE,
        status: 'active',
        agentIds: [],
        tasks: [],
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      const run: Run = {
        id: 'run-failure',
        projectId: project.id,
        agenda: project.agenda,
        channel: project.channel,
        source: RunSource.CLI,
        mode: RunMode.REVIEW,
        autonomy: 'review',
        status: 'queued',
        currentStepId: 'step-failure',
        createdAt: now,
        updatedAt: now,
      };
      const step: RunStep = {
        id: 'step-failure',
        runId: run.id,
        key: 'code-1',
        title: 'Broken step',
        phase: Phase.CODE,
        status: 'queued',
        sequence: 1,
        assignedRoles: [],
        retryCount: 0,
        checkpoint: { approvalGranted: true },
        actionBatch: {
          runId: run.id,
          stepId: 'step-failure',
          summary: 'Broken preview',
          approvalRequired: false,
          actions: [
            {
              type: 'tool_call',
              title: 'Missing tool',
              summary: 'This tool does not exist',
              risk: 'low',
              toolName: 'missing_tool',
              toolInput: {},
            },
          ],
          blastRadius: { permissions: [], filePaths: [], externalEffects: [] },
        },
      };

      store.saveProject(project);
      store.saveRun(run);
      store.saveRunStep(step);

      const durableEngine = new OrchestrationEngine(minimalConfig, store);
      await durableEngine.start();

      try {
        const failedSummary = await waitFor(async () => durableEngine.getRunSummary(run.id), (summary) => summary?.run.status === 'failed');
        expect(failedSummary?.run.status).toBe('failed');
      } finally {
        await durableEngine.stop();
      }
    });
  });

  describe('event bus and registry exposure', () => {
    it('exposes an event bus that can receive subscriptions', async () => {
      await engine.start();
      const bus = engine.getEventBus();
      const received: unknown[] = [];
      bus.on('AgendaSubmitted', (p) => received.push(p));
      await engine.submitAgenda('test', 'ch');
      expect(received).toHaveLength(1);
    });

    it('exposes the shared AgentRegistry singleton', async () => {
      await engine.start();
      expect(engine.getRegistry()).toBe(AgentRegistry.getInstance());
    });
  });
});

async function waitFor<T>(factory: () => Promise<T> | T, predicate: (value: T) => boolean, timeoutMs = 3_000): Promise<T> {
  const startedAt = Date.now();
  for (;;) {
    const value = await factory();
    if (predicate(value)) {
      return value;
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
