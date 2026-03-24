import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { OrchestrationEngine } from '../../src/core/engine.js';
import { AgentRegistry } from '../../src/core/registry.js';
import type { AigoraConfig } from '../../src/core/types.js';
import { Phase } from '../../src/core/types.js';

const minimalConfig: AigoraConfig = {
  messengers: [],
  llm: { provider: 'anthropic', model: 'claude-3-haiku', apiKey: 'test-key' },
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
