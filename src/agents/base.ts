import { nanoid } from 'nanoid';
import { AgentRole, AgentStatus } from '../core/types.js';
import type { Message } from '../core/types.js';
import type { AgentPersona, ThinkContext, Thought, ActionResult } from './persona.js';

export { AgentRole, AgentStatus };

// ---------------------------------------------------------------------------
// BaseAgent — abstract foundation for all role agents
// ---------------------------------------------------------------------------

export abstract class BaseAgent {
  readonly id: string;
  readonly name: string;
  readonly role: AgentRole;
  readonly persona: AgentPersona;
  status: AgentStatus;

  /** Inbox of received messages for this agent's current session. */
  protected readonly inbox: Message[] = [];

  constructor(role: AgentRole, persona: AgentPersona, name?: string) {
    this.id = nanoid();
    this.role = role;
    this.persona = persona;
    this.name = name ?? persona.name;
    this.status = AgentStatus.IDLE;
  }

  // ---------------------------------------------------------------------------
  // Abstract methods — each role provides its own implementation
  // ---------------------------------------------------------------------------

  /**
   * Analyse the current context and produce a Thought.
   * LLM calls will be wired here in a later iteration.
   */
  abstract think(context: ThinkContext): Promise<Thought>;

  /**
   * Execute an action derived from a Thought and return the result.
   */
  abstract act(thought: Thought): Promise<ActionResult>;

  // ---------------------------------------------------------------------------
  // Concrete helpers
  // ---------------------------------------------------------------------------

  /**
   * Emit a message to a channel.  The actual transport (Slack/Telegram/…) is
   * handled by the messenger layer; here we just record intent and log.
   */
  async speak(channel: string, message: string): Promise<void> {
    this.status = AgentStatus.RESPONDING;
    // Transport hook — orchestration layer picks this up via event bus.
    this._onSpeak(channel, message);
    this.status = AgentStatus.IDLE;
  }

  /**
   * Receive an incoming message and push it to the inbox.
   */
  async listen(message: Message): Promise<void> {
    this.status = AgentStatus.WAITING;
    this.inbox.push(message);
    this.status = AgentStatus.IDLE;
  }

  /**
   * Return the list of capabilities this agent advertises to the registry.
   * Derived classes may override to add role-specific capabilities.
   */
  getCapabilities(): string[] {
    return this.persona.expertise.slice();
  }

  // ---------------------------------------------------------------------------
  // Internal
  // ---------------------------------------------------------------------------

  /**
   * Override in subclasses or wire via event bus to handle outbound messages.
   * Default implementation is a no-op (useful for tests).
   */
  protected _onSpeak(_channel: string, _message: string): void {
    // no-op — wired by the orchestration layer
  }

  /** Convenience: build a base Thought skeleton. */
  protected buildThought(
    context: ThinkContext,
    summary: string,
    reasoning: string,
    confidence: number,
    suggestedAction: string,
    metadata?: Record<string, unknown>,
  ): Thought {
    return {
      agentId: this.id,
      summary,
      reasoning,
      confidence,
      suggestedAction,
      metadata,
    };
  }

  /** Convenience: build a successful ActionResult. */
  protected buildResult(action: string, output: string, artifacts?: Record<string, unknown>): ActionResult {
    return {
      agentId: this.id,
      action,
      success: true,
      output,
      artifacts,
    };
  }
}
