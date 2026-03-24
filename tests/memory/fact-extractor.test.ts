import { describe, it, expect } from 'vitest';
import { FactExtractor } from '../../src/memory/fact-extractor.js';
import type { Message } from '../../src/core/types.js';
import { Phase } from '../../src/core/types.js';

function makeMessage(content: string, agentId = 'agent-1'): Message {
  return {
    id: 'msg-test',
    projectId: 'proj-1',
    agentId,
    channel: 'general',
    content,
    phase: Phase.PLAN,
    timestamp: new Date(),
  };
}

describe('FactExtractor', () => {
  const extractor = new FactExtractor();

  describe('extractFacts', () => {
    it('returns an empty array when given no messages', () => {
      expect(extractor.extractFacts([])).toHaveLength(0);
    });

    it('returns an empty array when no patterns match the message content', () => {
      const msgs = [makeMessage('Hello team, great meeting today.')];
      expect(extractor.extractFacts(msgs)).toHaveLength(0);
    });

    it('extracts a decided_to_use fact from a "decided to use X for Y" sentence', () => {
      const msgs = [makeMessage('We decided to use PostgreSQL for the database.')];
      const facts = extractor.extractFacts(msgs);
      expect(facts.some((f) => f.predicate === 'decided_to_use')).toBe(true);
    });

    it('extracts a prefers fact from a "prefer X over Y" sentence', () => {
      const msgs = [makeMessage('We preferred TypeScript over JavaScript.')];
      const facts = extractor.extractFacts(msgs);
      expect(facts.some((f) => f.predicate === 'prefers')).toBe(true);
    });

    it('extracts an action_item fact from an "action item:" sentence', () => {
      const msgs = [makeMessage('Action item: review the PR by end of week.')];
      const facts = extractor.extractFacts(msgs);
      expect(facts.some((f) => f.predicate === 'action_item')).toBe(true);
    });

    it('sets source to the agentId of the originating message', () => {
      const msgs = [makeMessage('We decided to use Redis for caching.', 'agent-42')];
      const facts = extractor.extractFacts(msgs);
      expect(facts.every((f) => f.source === 'agent-42')).toBe(true);
    });

    it('extracts facts from multiple messages', () => {
      const msgs = [
        makeMessage('We decided to use React for the frontend.'),
        makeMessage('Action item: write unit tests.'),
      ];
      const facts = extractor.extractFacts(msgs);
      expect(facts.length).toBeGreaterThanOrEqual(2);
    });

    it('assigns confidence values between 0 and 1 inclusive', () => {
      const msgs = [makeMessage('We decided to use Kafka for the event bus.')];
      const facts = extractor.extractFacts(msgs);
      for (const fact of facts) {
        expect(fact.confidence).toBeGreaterThanOrEqual(0);
        expect(fact.confidence).toBeLessThanOrEqual(1);
      }
    });

    it('extracts a technical_choice fact', () => {
      const msgs = [makeMessage('The technical choice is event sourcing.')];
      const facts = extractor.extractFacts(msgs);
      expect(facts.some((f) => f.predicate === 'technical_choice')).toBe(true);
    });
  });
});
