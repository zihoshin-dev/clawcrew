import { describe, it, expect, vi } from 'vitest';
import { EventBus } from '../../src/core/event-bus.js';
import type { AigoraEvents } from '../../src/core/event-bus.js';
import { HumanGateManager } from '../../src/orchestrator/human-gate.js';
import { Phase } from '../../src/core/types.js';

function makeEventBus(): EventBus<AigoraEvents> {
  return new EventBus<AigoraEvents>();
}

describe('HumanGateManager', () => {
  describe('approval flow', () => {
    it('resolves with approved=true when HumanApprovalReceived is emitted with approved', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const approvalPromise = gate.requestApproval({
        projectId: 'proj1',
        phase: Phase.PLAN,
        summary: 'Plan ready',
        timeoutMs: 5_000,
      });

      // Simulate human responding
      bus.emit('HumanApprovalReceived', {
        projectId: 'proj1',
        phase: Phase.PLAN,
        approved: true,
        approvedBy: 'alice',
        comment: 'Looks good',
        respondedAt: new Date(),
      });

      const result = await approvalPromise;
      expect(result.approved).toBe(true);
      expect(result.approvedBy).toBe('alice');
      expect(result.comment).toBe('Looks good');
    });

    it('resolves with approved=false when HumanApprovalReceived is emitted with rejected', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const approvalPromise = gate.requestApproval({
        projectId: 'proj2',
        phase: Phase.DESIGN,
        summary: 'Design ready',
        timeoutMs: 5_000,
      });

      bus.emit('HumanApprovalReceived', {
        projectId: 'proj2',
        phase: Phase.DESIGN,
        approved: false,
        approvedBy: 'bob',
        comment: 'Needs revision',
        respondedAt: new Date(),
      });

      const result = await approvalPromise;
      expect(result.approved).toBe(false);
      expect(result.approvedBy).toBe('bob');
    });

    it('auto-rejects on timeout (safe default)', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const result = await gate.requestApproval({
        projectId: 'proj3',
        phase: Phase.DEPLOY,
        summary: 'Ready to deploy',
        timeoutMs: 50, // very short timeout
      });

      expect(result.approved).toBe(false);
      expect(result.respondedAt).toBeInstanceOf(Date);
    });

    it('ignores events for a different projectId', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const approvalPromise = gate.requestApproval({
        projectId: 'proj-A',
        phase: Phase.PLAN,
        summary: 'Plan',
        timeoutMs: 100,
      });

      // Emit for a different project — should be ignored
      bus.emit('HumanApprovalReceived', {
        projectId: 'proj-B',
        phase: Phase.PLAN,
        approved: true,
        respondedAt: new Date(),
      });

      // Times out and auto-rejects
      const result = await approvalPromise;
      expect(result.approved).toBe(false);
    });

    it('ignores events for a different phase', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const approvalPromise = gate.requestApproval({
        projectId: 'proj-C',
        phase: Phase.PLAN,
        summary: 'Plan',
        timeoutMs: 100,
      });

      // Emit for a different phase — should be ignored
      bus.emit('HumanApprovalReceived', {
        projectId: 'proj-C',
        phase: Phase.DESIGN,
        approved: true,
        respondedAt: new Date(),
      });

      const result = await approvalPromise;
      expect(result.approved).toBe(false);
    });

    it('emits HumanApprovalRequested event when requestApproval is called', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);
      const emitted: unknown[] = [];

      bus.on('HumanApprovalRequested', (payload) => {
        emitted.push(payload);
      });

      const approvalPromise = gate.requestApproval({
        projectId: 'proj-D',
        phase: Phase.PLAN,
        summary: 'Check this',
        timeoutMs: 100,
      });

      expect(emitted).toHaveLength(1);
      const payload = emitted[0] as { projectId: string; phase: Phase; summary: string };
      expect(payload.projectId).toBe('proj-D');
      expect(payload.phase).toBe(Phase.PLAN);
      expect(payload.summary).toBe('Check this');

      await approvalPromise; // let it timeout
    });

    it('matches by requestId when provided', async () => {
      const bus = makeEventBus();
      const gate = new HumanGateManager(bus, undefined);

      const approvalPromise = gate.requestApproval({
        requestId: 'approval-1',
        runId: 'run-1',
        stepId: 'step-1',
        projectId: 'proj-E',
        phase: Phase.REVIEW,
        summary: 'Review approval',
        timeoutMs: 5_000,
      });

      bus.emit('HumanApprovalReceived', {
        requestId: 'approval-1',
        runId: 'run-1',
        stepId: 'step-1',
        projectId: 'other-project',
        phase: Phase.RESEARCH,
        approved: true,
        respondedAt: new Date(),
      });

      const result = await approvalPromise;
      expect(result.approved).toBe(true);
      expect(result.requestId).toBe('approval-1');
      expect(result.runId).toBe('run-1');
    });
  });

  describe('messenger integration', () => {
    it('sends a notification message via messenger when provided', async () => {
      const bus = makeEventBus();
      const sendMessage = vi.fn().mockResolvedValue('msg-id');
      const messenger = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage,
        createThread: vi.fn(),
        onMessage: vi.fn(),
        formatAgentMessage: vi.fn(),
      };

      const gate = new HumanGateManager(bus, messenger);

      const approvalPromise = gate.requestApproval({
        projectId: 'chan-1',
        phase: Phase.DESIGN,
        summary: 'Design complete',
        timeoutMs: 50,
      });

      await approvalPromise;

      expect(sendMessage).toHaveBeenCalledOnce();
      const [channel, text] = sendMessage.mock.calls[0] as [string, string];
      expect(channel).toBe('chan-1');
      expect(text).toContain('DESIGN');
      expect(text).toContain('approve');
    });

    it('uses explicit channel when provided', async () => {
      const bus = makeEventBus();
      const sendMessage = vi.fn().mockResolvedValue('msg-id');
      const messenger = {
        connect: vi.fn(),
        disconnect: vi.fn(),
        sendMessage,
        createThread: vi.fn(),
        onMessage: vi.fn(),
        formatAgentMessage: vi.fn(),
      };

      const gate = new HumanGateManager(bus, messenger);
      await gate.requestApproval({
        projectId: 'project-only',
        channel: 'channel-2',
        phase: Phase.PLAN,
        summary: 'Plan ready',
        timeoutMs: 20,
      });

      expect(sendMessage).toHaveBeenCalledWith('channel-2', expect.any(String));
    });
  });
});
