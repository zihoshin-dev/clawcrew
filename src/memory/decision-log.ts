import { nanoid } from 'nanoid';
import { Phase } from '../core/types.js';

export interface Decision {
  id: string;
  title: string;
  rationale: string;
  alternatives: string[];
  decidedBy: string;
  phase: Phase;
  timestamp: Date;
  tags?: string[];
}

export class DecisionLog {
  private readonly decisions: Decision[] = [];

  record(decision: Omit<Decision, 'id' | 'timestamp'> & { id?: string; timestamp?: Date }): Decision {
    const full: Decision = {
      id: decision.id ?? nanoid(),
      title: decision.title,
      rationale: decision.rationale,
      alternatives: decision.alternatives,
      decidedBy: decision.decidedBy,
      phase: decision.phase,
      timestamp: decision.timestamp ?? new Date(),
      tags: decision.tags,
    };
    this.decisions.push(full);
    return { ...full };
  }

  getByTag(tag: string): Decision[] {
    return this.decisions
      .filter((d) => d.tags !== undefined && d.tags.includes(tag))
      .map((d) => ({ ...d }));
  }

  getByPhase(phase: Phase): Decision[] {
    return this.decisions
      .filter((d) => d.phase === phase)
      .map((d) => ({ ...d }));
  }

  getRecent(n: number): Decision[] {
    return this.decisions
      .slice()
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, n)
      .map((d) => ({ ...d }));
  }

  getAll(): Decision[] {
    return this.decisions.map((d) => ({ ...d }));
  }

  count(): number {
    return this.decisions.length;
  }
}
