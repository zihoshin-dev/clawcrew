import { App, LogLevel } from '@slack/bolt';
import type { MessengerAdapter, IncomingMessage, AgentIdentity } from './adapter.js';

// ---------------------------------------------------------------------------
// Role → emoji mapping for agent message headers
// ---------------------------------------------------------------------------

const ROLE_EMOJI: Record<string, string> = {
  RESEARCHER: '🔬',
  ARCHITECT: '🏗️',
  DEVELOPER: '💻',
  CRITIC: '🔍',
  PM: '📋',
  QA: '✅',
  SECURITY: '🔒',
  DESIGNER: '🎨',
  ANALYST: '📊',
  MEDIATOR: '⚖️',
  DEVOPS: '⚙️',
  SCRUM_MASTER: '🏃',
  JUDGE: '🏛️',
  RETROSPECTIVE: '🔄',
};

// ---------------------------------------------------------------------------
// Rate-limit helpers
// ---------------------------------------------------------------------------

const RATE_LIMIT_DELAY_MS = 1_100; // Slack Tier-1: ~1 req/sec

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// SlackAdapter
// ---------------------------------------------------------------------------

export interface SlackAdapterConfig {
  token: string;
  signingSecret: string;
  appToken?: string;
  botId?: string;
}

export class SlackAdapter implements MessengerAdapter {
  private readonly app: App;
  private readonly handlers: Array<(msg: IncomingMessage) => void> = [];
  private connected = false;
  private lastRequestAt = 0;

  constructor(config: SlackAdapterConfig) {
    this.app = new App({
      token: config.token,
      signingSecret: config.signingSecret,
      ...(config.appToken !== undefined
        ? { appToken: config.appToken, socketMode: true }
        : {}),
      logLevel: LogLevel.WARN,
    });

    // Register message listener at construction time so it is ready before connect()
    this.app.message(async ({ message, say: _say }) => {
      // The Slack `message` event payload may not always include `text`.
      // We guard with a type assertion and runtime check.
      const raw = message as {
        text?: string;
        channel?: string;
        user?: string;
        bot_id?: string;
        thread_ts?: string;
        ts?: string;
      };

      if (raw.text === undefined || raw.user === undefined) return;

      // Skip own messages (self-message loop prevention)
      if (
        config.botId !== undefined &&
        raw.bot_id !== undefined &&
        raw.bot_id === config.botId
      ) {
        return;
      }

      const incoming: IncomingMessage = {
        text: raw.text,
        channel: raw.channel ?? 'unknown',
        userId: raw.user,
        threadId: raw.thread_ts,
        timestamp: new Date((parseFloat(raw.ts ?? '0')) * 1_000),
        botId: raw.bot_id,
      };

      for (const handler of this.handlers) {
        handler(incoming);
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    await this.app.start();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.app.stop();
    this.connected = false;
  }

  async sendMessage(channel: string, text: string, threadId?: string, identity?: AgentIdentity): Promise<string> {
    await this.rateLimit();

    const result = await this.app.client.chat.postMessage({
      channel,
      text,
      ...(threadId !== undefined ? { thread_ts: threadId } : {}),
      ...(identity !== undefined ? { username: identity.username, icon_emoji: identity.iconEmoji } : {}),
    });

    return String(result.ts ?? '');
  }

  async createThread(channel: string, title: string): Promise<string> {
    await this.rateLimit();

    const result = await this.app.client.chat.postMessage({
      channel,
      text: title,
    });

    // The ts of the first message becomes the thread_ts for replies
    return String(result.ts ?? '');
  }

  onMessage(handler: (msg: IncomingMessage) => void): void {
    this.handlers.push(handler);
  }

  formatAgentMessage(agent: { name: string; role: string }, text: string): string {
    const emoji = ROLE_EMOJI[agent.role] ?? '🤖';
    return `${emoji} *[${agent.name} · ${agent.role}]*\n${text}`;
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestAt;
    if (elapsed < RATE_LIMIT_DELAY_MS) {
      await sleep(RATE_LIMIT_DELAY_MS - elapsed);
    }
    this.lastRequestAt = Date.now();
  }
}
