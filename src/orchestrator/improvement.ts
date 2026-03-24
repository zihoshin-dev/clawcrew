import { nanoid } from 'nanoid';

export type ImprovementCategory = 'perf' | 'quality' | 'security' | 'ux' | 'dx';

export interface Improvement {
  id: string;
  title: string;
  description: string;
  category: ImprovementCategory;
  /** 1–10 */
  impact: number;
  /** 1–10 */
  feasibility: number;
  suggestedBy: string;
  createdAt: Date;
}

export type ImprovementInput = Omit<Improvement, 'id' | 'createdAt'>;

// ---------------------------------------------------------------------------
// ImprovementTracker
// ---------------------------------------------------------------------------

export class ImprovementTracker {
  private readonly backlog: Map<string, Improvement> = new Map();

  suggest(input: ImprovementInput): Improvement {
    const improvement: Improvement = {
      ...input,
      id: nanoid(),
      createdAt: new Date(),
    };
    this.backlog.set(improvement.id, improvement);
    return improvement;
  }

  /** Returns improvements sorted by impact * feasibility descending. */
  prioritize(): Improvement[] {
    return Array.from(this.backlog.values()).sort(
      (a, b) => b.impact * b.feasibility - a.impact * a.feasibility,
    );
  }

  getBacklog(): Improvement[] {
    return Array.from(this.backlog.values());
  }

  getById(id: string): Improvement | undefined {
    return this.backlog.get(id);
  }

  remove(id: string): boolean {
    return this.backlog.delete(id);
  }
}
