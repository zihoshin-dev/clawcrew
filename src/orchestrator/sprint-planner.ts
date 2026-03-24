import { nanoid } from 'nanoid';
import type { Task } from '../core/types.js';
import { Phase } from '../core/types.js';
import type { Improvement } from './improvement.js';

export interface Sprint {
  id: string;
  goals: string[];
  tasks: Task[];
  startDate: Date;
  endDate: Date;
}

// ---------------------------------------------------------------------------
// AutoSprintPlanner
// ---------------------------------------------------------------------------

export class AutoSprintPlanner {
  /**
   * Selects top improvements that fit within capacity (sum of impact scores)
   * and converts them into a Sprint with corresponding tasks.
   *
   * @param improvements - Pre-sorted or unsorted list (will be sorted internally)
   * @param capacity     - Maximum total "impact" units that fit in the sprint
   */
  planNextSprint(improvements: Improvement[], capacity: number): Sprint {
    const sorted = [...improvements].sort(
      (a, b) => b.impact * b.feasibility - a.impact * a.feasibility,
    );

    const selected: Improvement[] = [];
    let remaining = capacity;

    for (const improvement of sorted) {
      if (improvement.impact <= remaining) {
        selected.push(improvement);
        remaining -= improvement.impact;
      }
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14); // 2-week sprint default

    const tasks: Task[] = selected.map((imp) => ({
      id: nanoid(),
      projectId: 'sprint',
      title: imp.title,
      description: imp.description,
      phase: categoryToPhase(imp.category),
      status: 'pending',
      createdAt: now,
    }));

    const goals = selected.map((imp) => imp.title);

    return {
      id: nanoid(),
      goals,
      tasks,
      startDate: now,
      endDate,
    };
  }
}

function categoryToPhase(category: string): Phase {
  const map: Record<string, Phase> = {
    perf: Phase.CODE,
    quality: Phase.TEST,
    security: Phase.REVIEW,
    ux: Phase.DESIGN,
    dx: Phase.CODE,
  };
  return map[category] ?? Phase.CODE;
}
