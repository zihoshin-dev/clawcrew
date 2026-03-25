import { describe, it, expect } from 'vitest';
import { MessageAuthenticator } from '../../src/messenger/auth.js';

describe('MessageAuthenticator', () => {
  describe('self-message rejection', () => {
    it('rejects when msg.botId matches config.botId', () => {
      const auth = new MessageAuthenticator({ botId: 'BOT123' });
      const result = auth.authenticate({ userId: 'user1', botId: 'BOT123' });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('self-message');
    });

    it('allows when msg.botId differs from config.botId', () => {
      const auth = new MessageAuthenticator({ botId: 'BOT123' });
      const result = auth.authenticate({ userId: 'user1', botId: 'OTHER_BOT' });
      expect(result.authenticated).toBe(true);
    });

    it('allows when config.botId is not set', () => {
      const auth = new MessageAuthenticator({});
      const result = auth.authenticate({ userId: 'user1', botId: 'BOT123' });
      expect(result.authenticated).toBe(true);
    });
  });

  describe('bot rejection', () => {
    it('rejects bot messages when rejectBots defaults to true', () => {
      const auth = new MessageAuthenticator({});
      const result = auth.authenticate({ userId: 'bot1', isBot: true });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('bot-message');
    });

    it('rejects bot messages when rejectBots is explicitly true', () => {
      const auth = new MessageAuthenticator({ rejectBots: true });
      const result = auth.authenticate({ userId: 'bot1', isBot: true });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('bot-message');
    });

    it('allows bot messages when rejectBots is false', () => {
      const auth = new MessageAuthenticator({ rejectBots: false });
      const result = auth.authenticate({ userId: 'bot1', isBot: true });
      expect(result.authenticated).toBe(true);
    });

    it('allows non-bot messages regardless of rejectBots setting', () => {
      const auth = new MessageAuthenticator({ rejectBots: true });
      const result = auth.authenticate({ userId: 'user1', isBot: false });
      expect(result.authenticated).toBe(true);
    });
  });

  describe('allowedUserIds whitelist', () => {
    it('rejects users not in the allowlist', () => {
      const auth = new MessageAuthenticator({ allowedUserIds: ['user1', 'user2'] });
      const result = auth.authenticate({ userId: 'user3' });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('user-not-allowed');
    });

    it('allows users in the allowlist', () => {
      const auth = new MessageAuthenticator({ allowedUserIds: ['user1', 'user2'] });
      const result = auth.authenticate({ userId: 'user1' });
      expect(result.authenticated).toBe(true);
    });

    it('allows all users when allowedUserIds is empty', () => {
      const auth = new MessageAuthenticator({ allowedUserIds: [] });
      const result = auth.authenticate({ userId: 'anyone' });
      expect(result.authenticated).toBe(true);
    });

    it('allows all users when allowedUserIds is not set', () => {
      const auth = new MessageAuthenticator({});
      const result = auth.authenticate({ userId: 'anyone' });
      expect(result.authenticated).toBe(true);
    });

    it('rejects when userId is undefined and allowlist is non-empty', () => {
      const auth = new MessageAuthenticator({ allowedUserIds: ['user1'] });
      const result = auth.authenticate({});
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('user-not-allowed');
    });
  });

  describe('self-message takes priority over bot rejection', () => {
    it('rejects as self-message before checking isBot', () => {
      const auth = new MessageAuthenticator({ botId: 'BOT123', rejectBots: true });
      const result = auth.authenticate({ userId: 'user1', botId: 'BOT123', isBot: true });
      expect(result.authenticated).toBe(false);
      expect(result.reason).toBe('self-message');
    });
  });
});
