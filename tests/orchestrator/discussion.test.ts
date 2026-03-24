import { describe, it, expect } from 'vitest';
import { DiscussionThread } from '../../src/orchestrator/discussion.js';

describe('DiscussionThread', () => {
  describe('construction', () => {
    it('generates a unique id', () => {
      const t1 = new DiscussionThread('topic', ['a1']);
      const t2 = new DiscussionThread('topic', ['a1']);
      expect(t1.id).not.toBe(t2.id);
    });

    it('stores topic and participants', () => {
      const thread = new DiscussionThread('Should we use Postgres?', ['agent-1', 'agent-2']);
      expect(thread.topic).toBe('Should we use Postgres?');
      expect(thread.participants).toEqual(['agent-1', 'agent-2']);
    });

    it('starts as active', () => {
      const thread = new DiscussionThread('t', []);
      expect(thread.isActive()).toBe(true);
    });
  });

  describe('addMessage', () => {
    it('appends a message retrievable via getHistory()', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.addMessage('a1', 'Hello', 0.9);
      const history = thread.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.content).toBe('Hello');
      expect(history[0]!.agentId).toBe('a1');
    });

    it('clamps confidence above 1 down to 1', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.addMessage('a1', 'msg', 1.5);
      expect(thread.getHistory()[0]!.confidence).toBe(1);
    });

    it('clamps confidence below 0 up to 0', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.addMessage('a1', 'msg', -0.3);
      expect(thread.getHistory()[0]!.confidence).toBe(0);
    });

    it('throws when the thread is already closed', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.close('done');
      expect(() => thread.addMessage('a1', 'late message', 0.5)).toThrow(/closed/);
    });

    it('accumulates multiple messages in order', () => {
      const thread = new DiscussionThread('t', ['a1', 'a2']);
      thread.addMessage('a1', 'first', 0.7);
      thread.addMessage('a2', 'second', 0.8);
      const history = thread.getHistory();
      expect(history).toHaveLength(2);
      expect(history[0]!.content).toBe('first');
      expect(history[1]!.content).toBe('second');
    });
  });

  describe('getHistory', () => {
    it('returns a shallow copy so external mutation does not affect internal state', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.addMessage('a1', 'msg', 0.5);
      const history = thread.getHistory();
      history.pop();
      expect(thread.getHistory()).toHaveLength(1);
    });
  });

  describe('close', () => {
    it('marks the thread as inactive', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.close('summary text');
      expect(thread.isActive()).toBe(false);
    });

    it('stores the provided summary', () => {
      const thread = new DiscussionThread('t', ['a1']);
      thread.close('final decision');
      expect(thread.summary).toBe('final decision');
    });

    it('summary is undefined while thread is still open', () => {
      const thread = new DiscussionThread('t', ['a1']);
      expect(thread.summary).toBeUndefined();
    });
  });
});
