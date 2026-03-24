import EventEmitter from 'eventemitter3';
import type { AgentRole, AgentStatus, Phase } from './types.js';

// ---------------------------------------------------------------------------
// Payload types for every named event
// ---------------------------------------------------------------------------

export interface AgendaSubmittedPayload {
  projectId: string;
  agenda: string;
  channel: string;
  submittedAt: Date;
}

export interface AgentJoinedPayload {
  projectId: string;
  agentId: string;
  role: AgentRole;
  joinedAt: Date;
}

export interface AgentLeftPayload {
  projectId: string;
  agentId: string;
  reason?: string;
  leftAt: Date;
}

export interface MessageSentPayload {
  projectId: string;
  messageId: string;
  agentId: string;
  channel: string;
  content: string;
  phase: Phase;
  timestamp: Date;
}

export interface PhaseChangedPayload {
  projectId: string;
  previousPhase: Phase;
  currentPhase: Phase;
  changedAt: Date;
}

export interface TaskCreatedPayload {
  projectId: string;
  taskId: string;
  title: string;
  assignedTo?: string;
  phase: Phase;
  createdAt: Date;
}

export interface TaskCompletedPayload {
  projectId: string;
  taskId: string;
  agentId: string;
  result?: unknown;
  completedAt: Date;
}

export interface ConsensusReachedPayload {
  projectId: string;
  topic: string;
  decision: string;
  participants: string[];
  phase: Phase;
  reachedAt: Date;
}

export interface DeadlockDetectedPayload {
  projectId: string;
  phase: Phase;
  involvedAgents: string[];
  detectedAt: Date;
}

export interface ErrorOccurredPayload {
  projectId?: string;
  agentId?: string;
  error: Error;
  context?: string;
  occurredAt: Date;
}

export interface AgentStatusChangedPayload {
  agentId: string;
  previousStatus: AgentStatus;
  currentStatus: AgentStatus;
  changedAt: Date;
}

// ---------------------------------------------------------------------------
// Canonical event map — maps event name → single payload type
// ---------------------------------------------------------------------------

export type AigoraEvents = {
  AgendaSubmitted: AgendaSubmittedPayload;
  AgentJoined: AgentJoinedPayload;
  AgentLeft: AgentLeftPayload;
  MessageSent: MessageSentPayload;
  PhaseChanged: PhaseChangedPayload;
  TaskCreated: TaskCreatedPayload;
  TaskCompleted: TaskCompletedPayload;
  ConsensusReached: ConsensusReachedPayload;
  DeadlockDetected: DeadlockDetectedPayload;
  ErrorOccurred: ErrorOccurredPayload;
  AgentStatusChanged: AgentStatusChangedPayload;
};

// ---------------------------------------------------------------------------
// Generic typed EventBus
// T maps event names to their single-payload type (not a tuple).
// Internally we cast to/from `any` at the eventemitter3 boundary so that
// plain interface / type aliases work without needing an index signature.
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFn = (...args: any[]) => void;

export class EventBus<T extends object> {
  private readonly emitter = new EventEmitter();

  on<K extends keyof T & string>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.on(event, listener as AnyFn);
    return this;
  }

  off<K extends keyof T & string>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.off(event, listener as AnyFn);
    return this;
  }

  once<K extends keyof T & string>(event: K, listener: (payload: T[K]) => void): this {
    this.emitter.once(event, listener as AnyFn);
    return this;
  }

  emit<K extends keyof T & string>(event: K, payload: T[K]): boolean {
    return this.emitter.emit(event, payload);
  }

  /**
   * Returns a Promise that resolves with the payload of the next matching
   * emission. Supply an optional predicate to filter events.
   */
  waitFor<K extends keyof T & string>(
    event: K,
    predicate?: (payload: T[K]) => boolean,
    timeoutMs?: number,
  ): Promise<T[K]> {
    return new Promise<T[K]>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined;

      const handler = (payload: T[K]): void => {
        if (predicate && !predicate(payload)) return;
        if (timer !== undefined) clearTimeout(timer);
        this.emitter.off(event, handler as AnyFn);
        resolve(payload);
      };

      this.emitter.on(event, handler as AnyFn);

      if (timeoutMs !== undefined) {
        timer = setTimeout(() => {
          this.emitter.off(event, handler as AnyFn);
          reject(new Error(`waitFor('${event}') timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }
    });
  }

  removeAllListeners(event?: keyof T & string): this {
    if (event !== undefined) {
      this.emitter.removeAllListeners(event);
    } else {
      this.emitter.removeAllListeners();
    }
    return this;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export const createEventBus = (): EventBus<AigoraEvents> => new EventBus<AigoraEvents>();
