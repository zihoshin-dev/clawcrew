import { describe, it, expect, vi } from 'vitest';
import { AgentRole, AgentStatus } from '../../src/core/types.js';
import type { Message, Phase } from '../../src/core/types.js';
import { BaseAgent } from '../../src/agents/base.js';
import { DEFAULT_PERSONAS } from '../../src/agents/persona.js';
import type { ThinkContext, Thought, ActionResult } from '../../src/agents/persona.js';

// Minimal concrete subclass for testing
class TestAgent extends BaseAgent {
  public speakLog: Array<{ channel: string; message: string }> = [];

  constructor() {
    super(AgentRole.DEVELOPER, DEFAULT_PERSONAS[AgentRole.DEVELOPER], 'TestDev');
  }

  async think(context: ThinkContext): Promise<Thought> {
    return this.buildThought(context, 'test summary', 'test reasoning', 0.8, 'test_action');
  }

  async act(thought: Thought): Promise<ActionResult> {
    return this.buildResult(thought.suggestedAction, 'test output', { key: 'val' });
  }

  protected override _onSpeak(channel: string, message: string): void {
    this.speakLog.push({ channel, message });
  }

  // Expose inbox length for assertions
  get inboxSize(): number {
    return this.inbox.length;
  }
}

function makeMessage(content: string): Message {
  return {
    id: 'msg-1',
    projectId: 'proj-1',
    agentId: 'other-agent',
    channel: 'general',
    content,
    phase: 'RESEARCH' as unknown as Phase,
    timestamp: new Date(),
  };
}

const thinkCtx: ThinkContext = {
  projectId: 'proj-1',
  phase: 'RESEARCH' as unknown as Phase,
  agenda: 'build something cool',
  recentMessages: [],
};

describe('BaseAgent', () => {
  describe('construction', () => {
    it('assigns a unique nanoid as the id', () => {
      const a = new TestAgent();
      const b = new TestAgent();
      expect(a.id).toBeTruthy();
      expect(a.id).not.toBe(b.id);
    });

    it('starts with IDLE status', () => {
      const agent = new TestAgent();
      expect(agent.status).toBe(AgentStatus.IDLE);
    });

    it('uses the name passed to the constructor over the persona name', () => {
      const agent = new TestAgent();
      expect(agent.name).toBe('TestDev');
    });

    it('exposes the correct role', () => {
      const agent = new TestAgent();
      expect(agent.role).toBe(AgentRole.DEVELOPER);
    });
  });

  describe('think', () => {
    it('returns a Thought with the expected agentId', async () => {
      const agent = new TestAgent();
      const thought = await agent.think(thinkCtx);
      expect(thought.agentId).toBe(agent.id);
    });

    it('returns a confidence value in [0, 1]', async () => {
      const agent = new TestAgent();
      const thought = await agent.think(thinkCtx);
      expect(thought.confidence).toBeGreaterThanOrEqual(0);
      expect(thought.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('act', () => {
    it('returns a successful ActionResult', async () => {
      const agent = new TestAgent();
      const thought = await agent.think(thinkCtx);
      const result = await agent.act(thought);
      expect(result.success).toBe(true);
      expect(result.agentId).toBe(agent.id);
    });

    it('includes the suggested action in the result', async () => {
      const agent = new TestAgent();
      const thought = await agent.think(thinkCtx);
      const result = await agent.act(thought);
      expect(result.action).toBe('test_action');
    });
  });

  describe('speak', () => {
    it('calls _onSpeak with the channel and message', async () => {
      const agent = new TestAgent();
      await agent.speak('general', 'hello world');
      expect(agent.speakLog).toEqual([{ channel: 'general', message: 'hello world' }]);
    });

    it('transitions to RESPONDING then back to IDLE during speak', async () => {
      const agent = new TestAgent();
      const statusDuring: AgentStatus[] = [];
      const original = agent['_onSpeak'].bind(agent);
      agent['_onSpeak'] = (ch: string, msg: string) => {
        statusDuring.push(agent.status);
        original(ch, msg);
      };
      await agent.speak('ch', 'msg');
      expect(statusDuring).toContain(AgentStatus.RESPONDING);
      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('listen', () => {
    it('adds the message to the inbox', async () => {
      const agent = new TestAgent();
      await agent.listen(makeMessage('hello'));
      expect(agent.inboxSize).toBe(1);
    });

    it('returns to IDLE after receiving a message', async () => {
      const agent = new TestAgent();
      await agent.listen(makeMessage('ping'));
      expect(agent.status).toBe(AgentStatus.IDLE);
    });
  });

  describe('getCapabilities', () => {
    it('returns the persona expertise list', () => {
      const agent = new TestAgent();
      const caps = agent.getCapabilities();
      expect(caps.length).toBeGreaterThan(0);
    });

    it('returns a copy so mutation does not affect persona', () => {
      const agent = new TestAgent();
      const caps = agent.getCapabilities();
      caps.push('injected');
      expect(agent.getCapabilities()).not.toContain('injected');
    });
  });
});
