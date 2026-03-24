import { nanoid } from 'nanoid';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DiscussionMessage {
  id: string;
  agentId: string;
  content: string;
  confidence: number;
  timestamp: Date;
}

// ---------------------------------------------------------------------------
// DiscussionThread
// ---------------------------------------------------------------------------

export class DiscussionThread {
  readonly id: string;
  readonly topic: string;
  readonly participants: string[];
  private readonly _messages: DiscussionMessage[] = [];
  private _active = true;
  private _summary: string | undefined;

  constructor(topic: string, participants: string[]) {
    this.id = nanoid();
    this.topic = topic;
    this.participants = [...participants];
  }

  /**
   * Append a new message from an agent.
   * confidence must be in [0, 1]; values outside that range are clamped.
   */
  addMessage(agentId: string, content: string, confidence: number): void {
    if (!this._active) {
      throw new Error(`DiscussionThread '${this.id}' is already closed.`);
    }

    const clamped = Math.min(1, Math.max(0, confidence));

    this._messages.push({
      id: nanoid(),
      agentId,
      content,
      confidence: clamped,
      timestamp: new Date(),
    });
  }

  /** Returns a shallow copy of all messages to prevent external mutation. */
  getHistory(): DiscussionMessage[] {
    return this._messages.map((m) => ({ ...m }));
  }

  isActive(): boolean {
    return this._active;
  }

  /**
   * Close the thread with a final summary.
   * After calling close(), addMessage() will throw.
   */
  close(summary: string): void {
    this._active = false;
    this._summary = summary;
  }

  get summary(): string | undefined {
    return this._summary;
  }
}
