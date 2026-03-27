import { describe, it, expect } from 'vitest';
import { createAdapter } from '../../src/messenger/factory.js';
import { SlackAdapter } from '../../src/messenger/slack.js';
import { TelegramAdapter } from '../../src/messenger/telegram.js';

describe('createAdapter', () => {
  it('creates a SlackAdapter when signingSecret is provided', () => {
    const adapter = createAdapter({
      type: 'slack',
      token: 'xoxb-test',
      signingSecret: 'secret',
    });

    expect(adapter).toBeInstanceOf(SlackAdapter);
  });

  it('throws for slack config without signingSecret', () => {
    expect(() =>
      createAdapter({
        type: 'slack',
        token: 'xoxb-test',
      }),
    ).toThrow(/signingSecret/);
  });

  it('creates a TelegramAdapter for telegram config', () => {
    const adapter = createAdapter({
      type: 'telegram',
      token: 'telegram-token',
    });

    expect(adapter).toBeInstanceOf(TelegramAdapter);
  });
});
