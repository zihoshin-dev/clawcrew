import { describe, it, expect } from 'vitest';
import { TaskBoard } from '../../src/orchestrator/task-board.js';
import { Phase } from '../../src/core/types.js';

describe('TaskBoard', () => {
  describe('createTask', () => {
    it('returns a task with a unique id', () => {
      const board = new TaskBoard();
      const t1 = board.createTask('Task A', 'desc A');
      const t2 = board.createTask('Task B', 'desc B');
      expect(t1.id).not.toBe(t2.id);
    });

    it('sets initial status to todo', () => {
      const board = new TaskBoard();
      const task = board.createTask('Fix bug', 'details');
      expect(task.status).toBe('todo');
    });

    it('uses RESEARCH as the default phase', () => {
      const board = new TaskBoard();
      const task = board.createTask('Research task', 'desc');
      expect(task.phase).toBe(Phase.RESEARCH);
    });

    it('accepts an explicit phase', () => {
      const board = new TaskBoard();
      const task = board.createTask('Code task', 'desc', undefined, Phase.CODE);
      expect(task.phase).toBe(Phase.CODE);
    });

    it('stores the assignee when provided', () => {
      const board = new TaskBoard();
      const task = board.createTask('Assigned task', 'desc', 'agent-42');
      expect(task.assignee).toBe('agent-42');
    });
  });

  describe('updateStatus', () => {
    it('changes the task status to the requested value', () => {
      const board = new TaskBoard();
      const { id } = board.createTask('T', 'd');
      board.updateStatus(id, 'in_progress');
      expect(board.getById(id)!.status).toBe('in_progress');
    });

    it('throws when the task id does not exist', () => {
      const board = new TaskBoard();
      expect(() => board.updateStatus('ghost-id', 'done')).toThrow(/not found/i);
    });
  });

  describe('getByPhase', () => {
    it('returns only tasks belonging to the requested phase', () => {
      const board = new TaskBoard();
      board.createTask('R1', 'd', undefined, Phase.RESEARCH);
      board.createTask('C1', 'd', undefined, Phase.CODE);
      board.createTask('R2', 'd', undefined, Phase.RESEARCH);

      const research = board.getByPhase(Phase.RESEARCH);
      expect(research).toHaveLength(2);
      expect(research.every((t) => t.phase === Phase.RESEARCH)).toBe(true);
    });

    it('returns an empty array when no tasks exist for the phase', () => {
      const board = new TaskBoard();
      board.createTask('T', 'd', undefined, Phase.RESEARCH);
      expect(board.getByPhase(Phase.DEPLOY)).toHaveLength(0);
    });
  });

  describe('getByAssignee', () => {
    it('returns only tasks assigned to the given agent', () => {
      const board = new TaskBoard();
      board.createTask('T1', 'd', 'agent-1');
      board.createTask('T2', 'd', 'agent-2');
      board.createTask('T3', 'd', 'agent-1');

      const tasks = board.getByAssignee('agent-1');
      expect(tasks).toHaveLength(2);
      expect(tasks.every((t) => t.assignee === 'agent-1')).toBe(true);
    });
  });

  describe('getAllActive', () => {
    it('excludes tasks with done status', () => {
      const board = new TaskBoard();
      const t1 = board.createTask('Active', 'd');
      const t2 = board.createTask('Done', 'd');
      board.updateStatus(t2.id, 'done');

      const active = board.getAllActive();
      expect(active.find((t) => t.id === t1.id)).toBeDefined();
      expect(active.find((t) => t.id === t2.id)).toBeUndefined();
    });
  });

  describe('getById', () => {
    it('returns a copy so mutation does not affect the board', () => {
      const board = new TaskBoard();
      const created = board.createTask('Mutable', 'd');
      const fetched = board.getById(created.id)!;
      fetched.title = 'Hacked';
      expect(board.getById(created.id)!.title).toBe('Mutable');
    });

    it('returns undefined for an unknown id', () => {
      const board = new TaskBoard();
      expect(board.getById('no-such-id')).toBeUndefined();
    });
  });

  describe('getAll', () => {
    it('returns all created tasks', () => {
      const board = new TaskBoard();
      board.createTask('T1', 'd');
      board.createTask('T2', 'd');
      board.createTask('T3', 'd');
      expect(board.getAll()).toHaveLength(3);
    });
  });
});
