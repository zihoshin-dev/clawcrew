import { nanoid } from 'nanoid';
import { Phase } from '../core/types.js';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface BoardTask {
  id: string;
  title: string;
  description: string;
  assignee?: string;
  phase: Phase;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}

export class TaskBoard {
  private readonly tasks: Map<string, BoardTask> = new Map();

  createTask(
    title: string,
    description: string,
    assignee?: string,
    phase: Phase = Phase.RESEARCH,
  ): BoardTask {
    const now = new Date();
    const task: BoardTask = {
      id: nanoid(),
      title,
      description,
      assignee,
      phase,
      status: 'todo',
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(task.id, task);
    return { ...task };
  }

  updateStatus(taskId: string, status: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (task === undefined) {
      throw new Error(`Task not found: ${taskId}`);
    }
    task.status = status;
    task.updatedAt = new Date();
  }

  getByPhase(phase: Phase): BoardTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.phase === phase)
      .map((t) => ({ ...t }));
  }

  getByAssignee(agentId: string): BoardTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.assignee === agentId)
      .map((t) => ({ ...t }));
  }

  getAllActive(): BoardTask[] {
    return Array.from(this.tasks.values())
      .filter((t) => t.status !== 'done')
      .map((t) => ({ ...t }));
  }

  getById(taskId: string): BoardTask | undefined {
    const task = this.tasks.get(taskId);
    return task !== undefined ? { ...task } : undefined;
  }

  getAll(): BoardTask[] {
    return Array.from(this.tasks.values()).map((t) => ({ ...t }));
  }
}
