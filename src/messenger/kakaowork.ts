import type { MessengerAdapter, AgentIdentity, IncomingMessage } from './adapter.js';

// ---------------------------------------------------------------------------
// KakaoWorkAdapter — stub implementation pending enterprise API key
// ---------------------------------------------------------------------------

export class KakaoWorkAdapter implements MessengerAdapter {
  async connect(): Promise<void> {
    throw new Error(
      'KakaoWork integration requires enterprise API key. Contact support@kakaowork.com',
    );
  }

  async disconnect(): Promise<void> {
    throw new Error(
      'KakaoWork integration requires enterprise API key. Contact support@kakaowork.com',
    );
  }

  async sendMessage(
    _channel: string,
    _text: string,
    _threadId?: string,
    _identity?: AgentIdentity,
  ): Promise<string> {
    throw new Error(
      'KakaoWork integration requires enterprise API key. Contact support@kakaowork.com',
    );
  }

  async createThread(_channel: string, _title: string): Promise<string> {
    throw new Error(
      'KakaoWork integration requires enterprise API key. Contact support@kakaowork.com',
    );
  }

  onMessage(_handler: (msg: IncomingMessage) => void): void {
    throw new Error(
      'KakaoWork integration requires enterprise API key. Contact support@kakaowork.com',
    );
  }

  formatAgentMessage(agent: { name: string; role: string }, text: string): string {
    return `[${agent.name} / ${agent.role}] ${text}`;
  }
}
