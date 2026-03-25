// ---------------------------------------------------------------------------
// HumanGateManager — request and await human approval between phases
// ---------------------------------------------------------------------------

import type { EventBus } from '../core/event-bus.js';
import type { AigoraEvents } from '../core/event-bus.js';
import type { Phase } from '../core/types.js';
import type { MessengerAdapter } from '../messenger/adapter.js';

export interface ApprovalRequest {
  projectId: string;
  phase: Phase;
  summary: string;
  /** Milliseconds to wait before auto-rejecting. Default: 1 800 000 (30 min). */
  timeoutMs: number;
}

export interface ApprovalResult {
  approved: boolean;
  approvedBy?: string;
  comment?: string;
  respondedAt: Date;
}

const DEFAULT_TIMEOUT_MS = 30 * 60 * 1_000; // 30 minutes

export class HumanGateManager {
  constructor(
    private readonly eventBus: EventBus<AigoraEvents>,
    private readonly messenger: MessengerAdapter | undefined,
  ) {}

  async requestApproval(request: ApprovalRequest): Promise<ApprovalResult> {
    const timeoutMs = request.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeoutMinutes = Math.round(timeoutMs / 60_000);

    // Emit the requested event
    this.eventBus.emit('HumanApprovalRequested', {
      projectId: request.projectId,
      phase: request.phase,
      summary: request.summary,
      timeoutMs,
      requestedAt: new Date(),
    });

    // Send a formatted message to the project channel if a messenger is available
    if (this.messenger !== undefined) {
      const text =
        `Phase *${request.phase}* completed.\n` +
        `Summary: ${request.summary}\n` +
        `Reply *approve* or *reject* within ${timeoutMinutes} minutes.`;
      await this.messenger.sendMessage(request.projectId, text).catch(() => {
        // Non-fatal: best-effort notification
      });
    }

    // Wait for a HumanApprovalReceived event scoped to this project+phase
    try {
      const received = await this.eventBus.waitFor(
        'HumanApprovalReceived',
        (payload) =>
          payload.projectId === request.projectId &&
          payload.phase === request.phase,
        timeoutMs,
      );

      return {
        approved: received.approved,
        approvedBy: received.approvedBy,
        comment: received.comment,
        respondedAt: received.respondedAt,
      };
    } catch {
      // Timeout — auto-reject (safe default)
      const respondedAt = new Date();
      this.eventBus.emit('HumanApprovalReceived', {
        projectId: request.projectId,
        phase: request.phase,
        approved: false,
        respondedAt,
      });
      return { approved: false, respondedAt };
    }
  }
}
