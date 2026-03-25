import { nanoid } from 'nanoid';
import { DiscussionThread } from './discussion.js';
import { ConsensusEngine } from './consensus.js';
import type { Vote, ConsensusResult } from './consensus.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DebatePhase = 'PROPOSE' | 'ARGUE' | 'COUNTER' | 'VOTE';

export interface AgentPosition {
  agentId: string;
  position: string;
  argument: string;
  confidence: number;
}

export interface DebateRound {
  round: number;
  phase: DebatePhase;
  positions: AgentPosition[];
  consensusResult: ConsensusResult;
}

export interface DebateResult {
  debateId: string;
  topic: string;
  rounds: DebateRound[];
  outcome: 'consensus' | 'deadlock';
  finalDecision?: string;
  finalConfidence: number;
  dissenting: string[];
  thread: DiscussionThread;
}

/**
 * Minimal interface that DebateProtocol requires from a participant.
 * The real BaseAgent class satisfies this via think().
 */
export interface DebateParticipant {
  id: string;
  name: string;
  role: string;
  deliberate(
    topic: string,
    phase: DebatePhase,
    history: string,
  ): Promise<{ position: string; argument: string; confidence: number }>;
}

// ---------------------------------------------------------------------------
// Deadlock detection helpers
// ---------------------------------------------------------------------------

/** Measure how much the set of positions changed between two rounds. */
function positionsConverged(prev: AgentPosition[], curr: AgentPosition[]): boolean {
  if (prev.length === 0) return false;
  const prevMap = new Map(prev.map((p) => [p.agentId, p.position]));
  const changed = curr.filter((c) => prevMap.get(c.agentId) !== c.position).length;
  return changed === 0;
}

/** Detect stride-2 oscillation: A,B,A,B alternating deadlock. */
function positionsOscillating(history: AgentPosition[][], current: AgentPosition[]): boolean {
  if (history.length < 2) return false;
  const twoBack = history[history.length - 2];
  if (twoBack === undefined || twoBack.length !== current.length) return false;
  const prevMap = new Map(twoBack.map((p) => [p.agentId, p.position]));
  return current.every((c) => prevMap.get(c.agentId) === c.position);
}

// ---------------------------------------------------------------------------
// DebateProtocol
// ---------------------------------------------------------------------------

const DEADLOCK_STALE_ROUNDS = 3;

export class DebateProtocol {
  private readonly consensus = new ConsensusEngine();

  async startDebate(
    topic: string,
    participants: DebateParticipant[],
    maxRounds: number,
  ): Promise<DebateResult> {
    const debateId = nanoid();
    const thread = new DiscussionThread(topic, participants.map((p) => p.id));
    const rounds: DebateRound[] = [];

    const phases: DebatePhase[] = ['PROPOSE', 'ARGUE', 'COUNTER', 'VOTE'];
    let prevPositions: AgentPosition[] = [];
    let staleCount = 0;
    const roundHistory: AgentPosition[][] = [];

    for (let roundNum = 1; roundNum <= maxRounds; roundNum++) {
      const phase = phases[(roundNum - 1) % phases.length] ?? 'PROPOSE';
      const history = this.buildHistory(thread);

      // Collect positions from all participants in parallel
      const settled = await Promise.allSettled(
        participants.map((agent) => agent.deliberate(topic, phase, history)),
      );

      const positions: AgentPosition[] = [];
      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        const agent = participants[i];
        if (result === undefined || agent === undefined) continue;

        if (result.status === 'fulfilled') {
          const { position, argument, confidence } = result.value;
          const clamped = Math.min(1, Math.max(0, confidence));
          positions.push({ agentId: agent.id, position, argument, confidence: clamped });
          thread.addMessage(
            agent.id,
            `[${phase}] ${position} — ${argument}`,
            clamped,
          );
        } else {
          // Agent failed to deliberate — record with zero confidence
          positions.push({
            agentId: agent.id,
            position: '',
            argument: `Error: ${String(result.reason)}`,
            confidence: 0,
          });
        }
      }

      const votes: Vote[] = positions
        .filter((p) => p.position !== '')
        .map((p) => ({ agentId: p.agentId, position: p.position, confidence: p.confidence }));

      const consensusResult = this.consensus.checkConsensus(votes);

      rounds.push({ round: roundNum, phase, positions, consensusResult });

      if (consensusResult.reached) {
        thread.close(`Consensus reached: ${consensusResult.decision ?? ''}`);
        return {
          debateId,
          topic,
          rounds,
          outcome: 'consensus',
          finalDecision: consensusResult.decision,
          finalConfidence: consensusResult.confidence,
          dissenting: consensusResult.dissenting,
          thread,
        };
      }

      // Deadlock detection: track stale rounds where positions don't change
      if (positionsConverged(prevPositions, positions)) {
        staleCount++;
      } else {
        staleCount = 0;
      }
      prevPositions = positions;

      // Stride-2 oscillation: A,B,A,B alternating deadlock (check before push)
      if (positionsOscillating(roundHistory, positions)) {
        roundHistory.push(positions);
        break;
      }

      roundHistory.push(positions);

      if (staleCount >= DEADLOCK_STALE_ROUNDS) {
        break;
      }
    }

    // No consensus — deadlock
    const lastRound = rounds[rounds.length - 1];
    const finalConfidence = lastRound?.consensusResult.confidence ?? 0;

    thread.close('Debate ended without consensus — deadlock detected.');

    return {
      debateId,
      topic,
      rounds,
      outcome: 'deadlock',
      finalConfidence,
      dissenting: participants.map((p) => p.id),
      thread,
    };
  }

  // ---------------------------------------------------------------------------
  // Internals
  // ---------------------------------------------------------------------------

  private buildHistory(thread: DiscussionThread): string {
    return thread
      .getHistory()
      .map((m) => `[${m.agentId}] ${m.content}`)
      .join('\n');
  }
}
