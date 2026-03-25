// ---------------------------------------------------------------------------
// MessageAuthenticator — filters incoming messages based on auth rules
// ---------------------------------------------------------------------------

export interface AuthConfig {
  /** If non-empty, only these user IDs are allowed. Empty = allow all. */
  allowedUserIds?: string[];
  /** Reject messages from bots. Defaults to true. */
  rejectBots?: boolean;
  /** The bot's own ID — messages from self are always rejected. */
  botId?: string;
}

export interface AuthResult {
  authenticated: boolean;
  reason?: string;
}

export class MessageAuthenticator {
  private readonly config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  authenticate(msg: {
    userId?: string;
    botId?: string;
    isBot?: boolean;
  }): AuthResult {
    // Self-message loop prevention
    if (
      this.config.botId !== undefined &&
      msg.botId !== undefined &&
      msg.botId === this.config.botId
    ) {
      return { authenticated: false, reason: 'self-message' };
    }

    // Reject bots (default true)
    const rejectBots = this.config.rejectBots ?? true;
    if (rejectBots && msg.isBot === true) {
      return { authenticated: false, reason: 'bot-message' };
    }

    // Allowlist check
    const allowedUserIds = this.config.allowedUserIds;
    if (
      allowedUserIds !== undefined &&
      allowedUserIds.length > 0 &&
      (msg.userId === undefined || !allowedUserIds.includes(msg.userId))
    ) {
      return { authenticated: false, reason: 'user-not-allowed' };
    }

    return { authenticated: true };
  }
}
