import { nanoid } from 'nanoid';
import { AgentRole, AgentStatus } from '../core/types.js';
import type { AgentActionEnvelope } from '../core/types.js';
import type { Message } from '../core/types.js';
import type { AgentPersona, ThinkContext, Thought, ActionResult } from './persona.js';
import type { LLMRouter, LlmResponse, TaskComplexity } from '../core/llm-router.js';
import type { ToolRegistry, ToolInput, ToolOutput } from '../tools/index.js';
import type { DlpFilter } from '../security/dlp.js';

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

  /** LLM router — injected by the orchestration engine after creation. */
  private _router: LLMRouter | undefined;

  /** Tool registry — optionally injected to enable tool use. */
  toolRegistry: ToolRegistry | undefined;

  /** DLP filter — optionally injected to mask PII before LLM calls. */
  private _dlpFilter: DlpFilter | undefined;

  constructor(role: AgentRole, persona: AgentPersona, name?: string) {
    this.id = nanoid();
    this.role = role;
    this.persona = persona;
    this.name = name ?? persona.name;
    this.status = AgentStatus.IDLE;
  }

  /** Inject the LLM router so this agent can make LLM calls. */
  setRouter(router: LLMRouter): void {
    this._router = router;
  }

  /** Whether an LLM router has been wired. */
  get hasRouter(): boolean {
    return this._router !== undefined;
  }

  /** Inject a tool registry so this agent can invoke tools. */
  setTools(registry: ToolRegistry): void {
    this.toolRegistry = registry;
  }

  /** Inject a DLP filter so LLM prompts are scrubbed of PII before sending. */
  setDlpFilter(filter: DlpFilter): void {
    this._dlpFilter = filter;
  }

  /** Invoke a named tool from the registry. Throws if the tool is not found. */
  protected async useTool(name: string, input: ToolInput): Promise<ToolOutput> {
    if (this.toolRegistry === undefined) {
      return { success: false, result: null, error: 'No tool registry wired', duration: 0 };
    }
    const tool = this.toolRegistry.get(name);
    if (tool === undefined) {
      return { success: false, result: null, error: `Tool not found: ${name}`, duration: 0 };
    }
    return tool.execute(input);
  }

  /**
   * Call the LLM with the agent's persona as system prompt.
   * Returns the LLM response, or undefined if no router is wired.
   */
  protected async callLLM(
    userPrompt: string,
    complexity: TaskComplexity = 'medium',
    systemPromptOverride?: string,
  ): Promise<LlmResponse | undefined> {
    if (this._router === undefined) return undefined;
    if (!this._router.hasConfiguredProvider(this.role)) return undefined;
    const filteredPrompt = this._dlpFilter !== undefined
      ? this._dlpFilter.filter(userPrompt).filtered
      : userPrompt;
    return this._router.route({
      prompt: filteredPrompt,
      systemPrompt: systemPromptOverride ?? this.persona.systemPrompt,
      agentRole: this.role,
      taskComplexity: complexity,
    });
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
  protected buildResult(
    action: string,
    output: string,
    artifacts?: Record<string, unknown>,
    envelopes?: AgentActionEnvelope[],
  ): ActionResult {
    return {
      agentId: this.id,
      action,
      success: true,
      output,
      artifacts,
      envelopes,
    };
  }
}
