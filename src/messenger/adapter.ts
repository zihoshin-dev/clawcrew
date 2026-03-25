// ---------------------------------------------------------------------------
// MessengerAdapter — common interface for all messenger platform adapters
// ---------------------------------------------------------------------------

export interface AgentIdentity {
  username: string;
  iconEmoji: string;
}

export interface IncomingMessage {
  text: string;
  channel: string;
  userId: string;
  threadId?: string;
  timestamp: Date;
  isBot?: boolean;
  botId?: string;
}

export interface MessengerAdapter {
  /** Establish connection to the messenger platform. */
  connect(): Promise<void>;

  /** Gracefully close the connection. */
  disconnect(): Promise<void>;

  /**
   * Send a text message to the given channel.
   * Optionally post into an existing thread/reply chain.
   * When identity is provided, the message is posted with a custom username and icon.
   * Returns the platform-specific message id.
   */
  sendMessage(channel: string, text: string, threadId?: string, identity?: AgentIdentity): Promise<string>;

  /**
   * Create a new thread/topic in the given channel with the supplied title.
   * Returns the platform-specific thread id.
   */
  createThread(channel: string, title: string): Promise<string>;

  /** Register a handler that is called for every incoming message. */
  onMessage(handler: (msg: IncomingMessage) => void): void;

  /**
   * Format a message so it is visually attributed to a specific agent.
   * Each adapter may apply platform-native formatting (bold, emoji, etc.).
   */
  formatAgentMessage(agent: { name: string; role: string }, text: string): string;
}
