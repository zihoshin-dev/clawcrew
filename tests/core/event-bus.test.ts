import { describe, it, expect, vi } from 'vitest';
import { EventBus, createEventBus } from '../../src/core/event-bus.js';
import type { AigoraEvents } from '../../src/core/event-bus.js';
import { Phase } from '../../src/core/types.js';
import { AgentRole, AgentStatus } from '../../src/core/registry.js';

describe('EventBus', () => {
  describe('on / emit', () => {
    it('calls registered listener with the emitted payload', () => {
      const bus = new EventBus<AigoraEvents>();
      const handler = vi.fn();

      bus.on('AgentJoined', handler);
      const payload = {
        projectId: 'p1',
        agentId: 'a1',
        role: AgentRole.DEVELOPER,
        joinedAt: new Date(),
      };
      bus.emit('AgentJoined', payload);

      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(payload);
    });

    it('returns true when at least one listener handled the event', () => {
      const bus = new EventBus<AigoraEvents>();
      bus.on('AgentLeft', vi.fn());

      const result = bus.emit('AgentLeft', {
        projectId: 'p1',
        agentId: 'a1',
        leftAt: new Date(),
      });

      expect(result).toBe(true);
    });

    it('returns false when no listeners are registered for the event', () => {
      const bus = new EventBus<AigoraEvents>();

      const result = bus.emit('AgentLeft', {
        projectId: 'p1',
        agentId: 'a1',
        leftAt: new Date(),
      });

      expect(result).toBe(false);
    });

    it('calls all registered listeners for the same event', () => {
      const bus = new EventBus<AigoraEvents>();
      const h1 = vi.fn();
      const h2 = vi.fn();

      bus.on('ErrorOccurred', h1);
      bus.on('ErrorOccurred', h2);
      bus.emit('ErrorOccurred', { error: new Error('boom'), occurredAt: new Date() });

      expect(h1).toHaveBeenCalledOnce();
      expect(h2).toHaveBeenCalledOnce();
    });
  });

  describe('off', () => {
    it('stops calling a listener after it is removed', () => {
      const bus = new EventBus<AigoraEvents>();
      const handler = vi.fn();

      bus.on('AgentStatusChanged', handler);
      bus.off('AgentStatusChanged', handler);
      bus.emit('AgentStatusChanged', {
        agentId: 'a1',
        previousStatus: AgentStatus.IDLE,
        currentStatus: AgentStatus.THINKING,
        changedAt: new Date(),
      });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('once', () => {
    it('calls the listener only for the first emission', () => {
      const bus = new EventBus<AigoraEvents>();
      const handler = vi.fn();

      bus.once('PhaseChanged', handler);

      const payload = {
        projectId: 'p1',
        previousPhase: Phase.RESEARCH,
        currentPhase: Phase.PLAN,
        changedAt: new Date(),
      };

      bus.emit('PhaseChanged', payload);
      bus.emit('PhaseChanged', payload);

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('waitFor', () => {
    it('resolves with the payload of the next emission', async () => {
      const bus = new EventBus<AigoraEvents>();
      const payload = {
        projectId: 'proj-1',
        agenda: 'build something',
        channel: 'slack',
        submittedAt: new Date(),
      };

      const promise = bus.waitFor('AgendaSubmitted');
      bus.emit('AgendaSubmitted', payload);

      await expect(promise).resolves.toEqual(payload);
    });

    it('resolves only when the predicate returns true', async () => {
      const bus = new EventBus<AigoraEvents>();

      const promise = bus.waitFor(
        'AgendaSubmitted',
        (p) => p.projectId === 'target',
      );

      bus.emit('AgendaSubmitted', {
        projectId: 'other',
        agenda: 'x',
        channel: 'c',
        submittedAt: new Date(),
      });
      bus.emit('AgendaSubmitted', {
        projectId: 'target',
        agenda: 'y',
        channel: 'c',
        submittedAt: new Date(),
      });

      const result = await promise;
      expect(result.projectId).toBe('target');
    });

    it('rejects after the specified timeout if no matching event arrives', async () => {
      const bus = new EventBus<AigoraEvents>();

      await expect(bus.waitFor('AgendaSubmitted', undefined, 20)).rejects.toThrow(
        /timed out/i,
      );
    });
  });

  describe('removeAllListeners', () => {
    it('removes all listeners for a specific event', () => {
      const bus = new EventBus<AigoraEvents>();
      const handler = vi.fn();

      bus.on('ErrorOccurred', handler);
      bus.removeAllListeners('ErrorOccurred');
      bus.emit('ErrorOccurred', { error: new Error('x'), occurredAt: new Date() });

      expect(handler).not.toHaveBeenCalled();
    });

    it('removes listeners for all events when called without argument', () => {
      const bus = new EventBus<AigoraEvents>();
      const h1 = vi.fn();
      const h2 = vi.fn();

      bus.on('AgentJoined', h1);
      bus.on('AgentLeft', h2);
      bus.removeAllListeners();

      bus.emit('AgentJoined', { projectId: 'p', agentId: 'a', role: AgentRole.QA, joinedAt: new Date() });
      bus.emit('AgentLeft', { projectId: 'p', agentId: 'a', leftAt: new Date() });

      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  describe('createEventBus factory', () => {
    it('returns an EventBus instance typed for AigoraEvents', () => {
      const bus = createEventBus();
      expect(bus).toBeInstanceOf(EventBus);
    });
  });
});
