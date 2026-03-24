import { describe, it, expect } from 'vitest';
import { AgentFactory } from '../../src/agents/factory.js';
import { AgentRole, AgentStatus } from '../../src/core/types.js';
import { BaseAgent } from '../../src/agents/base.js';

const ALL_ROLES = Object.values(AgentRole);

describe('AgentFactory', () => {
  describe('create', () => {
    it.each(ALL_ROLES)('creates an agent for role %s', (role) => {
      const agent = AgentFactory.create(role);
      expect(agent).toBeInstanceOf(BaseAgent);
      expect(agent.role).toBe(role);
    });

    it('returns a new instance (unique id) on each call for the same role', () => {
      const a = AgentFactory.create(AgentRole.DEVELOPER);
      const b = AgentFactory.create(AgentRole.DEVELOPER);
      expect(a.id).not.toBe(b.id);
    });

    it('initialises every agent with IDLE status', () => {
      for (const role of ALL_ROLES) {
        const agent = AgentFactory.create(role);
        expect(agent.status).toBe(AgentStatus.IDLE);
      }
    });

    it('created agent has non-empty capabilities', () => {
      const agent = AgentFactory.create(AgentRole.RESEARCHER);
      expect(agent.getCapabilities().length).toBeGreaterThan(0);
    });
  });

  describe('createAll', () => {
    it('returns a map with exactly 14 entries — one per role', () => {
      const team = AgentFactory.createAll();
      expect(team.size).toBe(ALL_ROLES.length);
    });

    it('contains an entry for every AgentRole value', () => {
      const team = AgentFactory.createAll();
      for (const role of ALL_ROLES) {
        expect(team.has(role)).toBe(true);
      }
    });

    it('each map value is a BaseAgent with the matching role', () => {
      const team = AgentFactory.createAll();
      for (const [role, agent] of team) {
        expect(agent).toBeInstanceOf(BaseAgent);
        expect(agent.role).toBe(role);
      }
    });
  });

  describe('createMany', () => {
    it('returns agents only for the requested roles', () => {
      const requested = [AgentRole.PM, AgentRole.QA, AgentRole.SECURITY];
      const agents = AgentFactory.createMany(requested);
      expect(agents).toHaveLength(3);
      expect(agents.map((a) => a.role)).toEqual(expect.arrayContaining(requested));
    });

    it('returns an empty array when passed an empty role list', () => {
      expect(AgentFactory.createMany([])).toHaveLength(0);
    });
  });
});
