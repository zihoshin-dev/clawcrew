import { Bot, type Context } from 'grammy';
import type { MessengerAdapter, IncomingMessage } from './adapter.js';

// ---------------------------------------------------------------------------
// Role → avatar emoji for Telegram messages
// ---------------------------------------------------------------------------

const ROLE_AVATAR: Record<string, string> = {
  RESEARCHER: '🔬',
  ARCHITECT: '🏗',
  DEVELOPER: '💻',
  CRITIC: '🔍',
  PM: '📋',
  QA: '✅',
  SECURITY: '🔒',
  DESIGNER: '🎨',
  ANALYST: '📊',
  MEDIATOR: '⚖',
  DEVOPS: '⚙',
  SCRUM_MASTER: '🏃',
  JUDGE: '🏛',
  RETROSPECTIVE: '🔄',
};

// ---------------------------------------------------------------------------
// TelegramAdapter
// ---------------------------------------------------------------------------

export interface TelegramAdapterConfig {
  token: string;
  botId?: string;
}

export class TelegramAdapter implements MessengerAdapter {
  private readonly bot: Bot;
  private readonly handlers: Array<(msg: IncomingMessage) => void> = [];
  private connected = false;

  constructor(config: TelegramAdapterConfig) {
    this.bot = new Bot(config.token);

    // Register message handler at construction; active after connect()
    this.bot.on('message:text', (ctx: Context) => {
      const msg = ctx.message;
      if (msg === undefined || !('text' in msg) || msg.text === undefined) return;

      const from = msg.from;
      const userId = from !== undefined ? String(from.id) : 'unknown';
      const isBot = from?.is_bot === true;

      // Skip own messages (self-message loop prevention)
      if (config.botId !== undefined && userId === config.botId) return;

      // Telegram uses reply_to_message to form a thread. We treat the
      // message_id of the replied-to message as the threadId.
      const threadId =
        msg.reply_to_message !== undefined
          ? String(msg.reply_to_message.message_id)
          : undefined;

      const incoming: IncomingMessage = {
        text: msg.text,
        channel: String(msg.chat.id),
        userId,
        threadId,
        timestamp: new Date(msg.date * 1_000),
        isBot,
      };

      for (const handler of this.handlers) {
        handler(incoming);
      }
    });
  }

  async connect(): Promise<void> {
    if (this.connected) return;
    // Start polling in the background; do not await (it runs indefinitely)
    void this.bot.start();
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;
    await this.bot.stop();
    this.connected = false;
  }

  /**
   * Send a message to a chat (channel = chat_id as string).
   * If threadId is provided it is treated as the message_id to reply to,
   * implementing reply-based threading.
   * Returns the sent message_id as a string.
   */
  async sendMessage(channel: string, text: string, threadId?: string): Promise<string> {
    const chatId = parseInt(channel, 10);

    const sent = await this.bot.api.sendMessage(chatId, text, {
      parse_mode: 'HTML',
      ...(threadId !== undefined
        ? { reply_parameters: { message_id: parseInt(threadId, 10) } }
        : {}),
    });

    return String(sent.message_id);
  }

  /**
   * Create a new "thread" by posting the title as the first message.
   * Returns the message_id of that first post, which subsequent replies use as threadId.
   */
  async createThread(channel: string, title: string): Promise<string> {
    return this.sendMessage(channel, `<b>${escapeHtml(title)}</b>`);
  }

  onMessage(handler: (msg: IncomingMessage) => void): void {
    this.handlers.push(handler);
  }

  formatAgentMessage(agent: { name: string; role: string }, text: string): string {
    const avatar = ROLE_AVATAR[agent.role] ?? '🤖';
    const header = `${avatar} <b>[${escapeHtml(agent.name)} · ${agent.role}]</b>`;
    return `${header}\n${escapeHtml(text)}`;
  }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
