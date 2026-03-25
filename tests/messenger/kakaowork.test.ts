import { describe, it, expect } from 'vitest';
import { KakaoWorkAdapter } from '../../src/messenger/kakaowork.js';
import { createAdapter } from '../../src/messenger/factory.js';

describe('KakaoWorkAdapter', () => {
  it('connect() throws with enterprise API key message', async () => {
    const adapter = new KakaoWorkAdapter();
    await expect(adapter.connect()).rejects.toThrow(
      'KakaoWork integration requires enterprise API key',
    );
  });

  it('sendMessage() throws with enterprise API key message', async () => {
    const adapter = new KakaoWorkAdapter();
    await expect(adapter.sendMessage('channel', 'hello')).rejects.toThrow(
      'KakaoWork integration requires enterprise API key',
    );
  });

  it('factory creates KakaoWorkAdapter for type kakaowork', () => {
    const adapter = createAdapter({ type: 'kakaowork', token: 'dummy' });
    expect(adapter).toBeInstanceOf(KakaoWorkAdapter);
  });
});
