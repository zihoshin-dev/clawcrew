// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Vote {
  agentId: string;
  /** The position/decision this agent votes for. */
  position: string;
  /** Confidence in that position, in [0, 1]. */
  confidence: number;
}

export interface ConsensusResult {
  reached: boolean;
  /** The winning decision — defined only when reached is true. */
  decision?: string;
  /** Aggregate confidence of the majority group. */
  confidence: number;
  /** Agent ids whose position differs from the consensus decision. */
  dissenting: string[];
}

// ---------------------------------------------------------------------------
// ConsensusEngine
// ---------------------------------------------------------------------------

/** Threshold: fraction of votes that must agree on a single position. */
const AGREEMENT_THRESHOLD = 0.7;

/** Minimum average confidence of the agreeing group. */
const CONFIDENCE_THRESHOLD = 0.6;

export class ConsensusEngine {
  /**
   * Evaluate whether the supplied votes represent consensus.
   *
   * Consensus is reached when:
   *   - A single position is held by > 70 % of voters, AND
   *   - The average confidence of that group exceeds 0.6.
   */
  checkConsensus(votes: Vote[]): ConsensusResult {
    if (votes.length === 0) {
      return { reached: false, confidence: 0, dissenting: [] };
    }

    // Group votes by position
    const groups = new Map<string, Vote[]>();
    for (const vote of votes) {
      const existing = groups.get(vote.position);
      if (existing !== undefined) {
        existing.push(vote);
      } else {
        groups.set(vote.position, [vote]);
      }
    }

    // Find the position with the most votes
    let topPosition = '';
    let topVotes: Vote[] = [];
    for (const [position, group] of groups) {
      if (group.length > topVotes.length) {
        topPosition = position;
        topVotes = group;
      }
    }

    const agreementRatio = topVotes.length / votes.length;
    const avgConfidence =
      topVotes.reduce((sum, v) => sum + v.confidence, 0) / topVotes.length;

    const reached =
      agreementRatio > AGREEMENT_THRESHOLD && avgConfidence > CONFIDENCE_THRESHOLD;

    const dissenting = reached
      ? votes
          .filter((v) => v.position !== topPosition)
          .map((v) => v.agentId)
      : [];

    return {
      reached,
      decision: reached ? topPosition : undefined,
      confidence: avgConfidence,
      dissenting,
    };
  }
}
