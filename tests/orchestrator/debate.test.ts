import { describe, it, expect } from 'vitest';
import { DebateProtocol } from '../../src/orchestrator/debate.js';
import type { BaseAgent, DebatePhase } from '../../src/orchestrator/debate.js';
import { DiscussionThread } from '../../src/orchestrator/discussion.js';

// Factory for a stub agent that always returns the given position
function makeAgent(id: string, position: string, confidence = 0.9): BaseAgent {
  return {
    id,
    name: `Agent-${id}`,
    role: 'DEVELOPER',
    async deliberate(_topic: string, _phase: DebatePhase, _history: string) {
      return { position, argument: `argument for ${position}`, confidence };
    },
  };
}

describe('DebateProtocol', () => {
  const protocol = new DebateProtocol();

  describe('consensus outcome', () => {
    it('returns outcome=consensus when all agents agree', async () => {
      const agents = [
        makeAgent('a1', 'use-postgres'),
        makeAgent('a2', 'use-postgres'),
        makeAgent('a3', 'use-postgres'),
      ];
      const result = await protocol.startDebate('Database choice', agents, 4);
      expect(result.outcome).toBe('consensus');
      expect(result.finalDecision).toBe('use-postgres');
    });

    it('closes the discussion thread with a consensus summary', async () => {
      const agents = [
        makeAgent('a1', 'microservices'),
        makeAgent('a2', 'microservices'),
        makeAgent('a3', 'microservices'),
      ];
      const result = await protocol.startDebate('Architecture', agents, 4);
      expect(result.thread.isActive()).toBe(false);
      expect(result.thread.summary).toMatch(/consensus/i);
    });

    it('sets dissenting to only agents that disagreed', async () => {
      const agents = [
        makeAgent('a1', 'option-A', 0.95),
        makeAgent('a2', 'option-A', 0.9),
        makeAgent('a3', 'option-A', 0.85),
        makeAgent('a4', 'option-B', 0.7),
      ];
      const result = await protocol.startDebate('Pick one', agents, 4);
      expect(result.outcome).toBe('consensus');
      expect(result.dissenting).toEqual(['a4']);
    });
  });

  describe('deadlock outcome', () => {
    it('returns outcome=deadlock when agents never converge', async () => {
      // Each agent votes differently — can never reach 70% threshold
      const agents = [
        makeAgent('a1', 'option-A', 0.9),
        makeAgent('a2', 'option-B', 0.9),
        makeAgent('a3', 'option-C', 0.9),
      ];
      const result = await protocol.startDebate('Deadlock topic', agents, 6);
      expect(result.outcome).toBe('deadlock');
      expect(result.finalDecision).toBeUndefined();
    });

    it('closes the thread even on deadlock', async () => {
      const agents = [makeAgent('a1', 'X'), makeAgent('a2', 'Y'), makeAgent('a3', 'Z')];
      const result = await protocol.startDebate('Stuck', agents, 4);
      expect(result.thread.isActive()).toBe(false);
    });

    it('lists all participants as dissenting on deadlock', async () => {
      const agents = [makeAgent('a1', 'A'), makeAgent('a2', 'B'), makeAgent('a3', 'C')];
      const result = await protocol.startDebate('Diverge', agents, 4);
      expect(result.dissenting).toEqual(expect.arrayContaining(['a1', 'a2', 'a3']));
    });
  });

  describe('rounds and structure', () => {
    it('records at least one round', async () => {
      const agents = [makeAgent('a1', 'yes'), makeAgent('a2', 'yes')];
      const result = await protocol.startDebate('Quick', agents, 2);
      expect(result.rounds.length).toBeGreaterThanOrEqual(1);
    });

    it('debate result includes a DiscussionThread', async () => {
      const agents = [makeAgent('a1', 'yes'), makeAgent('a2', 'yes')];
      const result = await protocol.startDebate('t', agents, 2);
      expect(result.thread).toBeInstanceOf(DiscussionThread);
    });

    it('debateId is a non-empty string', async () => {
      const agents = [makeAgent('a1', 'p'), makeAgent('a2', 'p')];
      const result = await protocol.startDebate('t', agents, 2);
      expect(result.debateId.length).toBeGreaterThan(0);
    });
  });
});
