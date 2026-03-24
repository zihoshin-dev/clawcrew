import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry, AgentRole, AgentStatus } from '../../src/core/registry.js';
import type { AgentInfo } from '../../src/core/registry.js';

function makeAgent(id: string, role: AgentRole = AgentRole.DEVELOPER): AgentInfo {
  return {
    id,
    name: `Agent-${id}`,
    role,
    status: AgentStatus.IDLE,
    capabilities: [{ name: 'code' }],
    model: 'claude-3',
    registeredAt: new Date(),
  };
}

describe('AgentRegistry', () => {
  beforeEach(() => {
    AgentRegistry.reset();
  });

  describe('getInstance (singleton)', () => {
    it('returns the same instance on repeated calls', () => {
      const a = AgentRegistry.getInstance();
      const b = AgentRegistry.getInstance();
      expect(a).toBe(b);
    });

    it('returns a fresh instance after reset()', () => {
      const a = AgentRegistry.getInstance();
      AgentRegistry.reset();
      const b = AgentRegistry.getInstance();
      expect(a).not.toBe(b);
    });
  });

  describe('register', () => {
    it('stores an agent so it can be retrieved by id', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('dev-1'));
      expect(registry.getById('dev-1')).toBeDefined();
    });

    it('throws when registering a duplicate id', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('dup'));
      expect(() => registry.register(makeAgent('dup'))).toThrow(/already registered/);
    });

    it('increments the count after each registration', () => {
      const registry = AgentRegistry.getInstance();
      expect(registry.count()).toBe(0);
      registry.register(makeAgent('a1'));
      registry.register(makeAgent('a2'));
      expect(registry.count()).toBe(2);
    });
  });

  describe('unregister', () => {
    it('removes an agent so getById returns undefined', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('gone'));
      registry.unregister('gone');
      expect(registry.getById('gone')).toBeUndefined();
    });

    it('throws when unregistering an id that does not exist', () => {
      const registry = AgentRegistry.getInstance();
      expect(() => registry.unregister('ghost')).toThrow(/not registered/);
    });
  });

  describe('getByRole', () => {
    it('returns only agents matching the requested role', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('r1', AgentRole.RESEARCHER));
      registry.register(makeAgent('d1', AgentRole.DEVELOPER));
      registry.register(makeAgent('r2', AgentRole.RESEARCHER));

      const researchers = registry.getByRole(AgentRole.RESEARCHER);
      expect(researchers).toHaveLength(2);
      expect(researchers.every((a) => a.role === AgentRole.RESEARCHER)).toBe(true);
    });

    it('returns an empty array when no agents match the role', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('d1', AgentRole.DEVELOPER));
      expect(registry.getByRole(AgentRole.SECURITY)).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('returns a copy, not the internal reference', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('x1'));
      const copy = registry.getById('x1');
      expect(copy).toBeDefined();
      // mutating the copy must not affect the stored record
      copy!.name = 'mutated';
      expect(registry.getById('x1')!.name).toBe('Agent-x1');
    });
  });

  describe('updateStatus', () => {
    it('changes the stored status for an agent', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('s1'));
      registry.updateStatus('s1', AgentStatus.THINKING);
      expect(registry.getById('s1')!.status).toBe(AgentStatus.THINKING);
    });

    it('throws when the agent id does not exist', () => {
      const registry = AgentRegistry.getInstance();
      expect(() => registry.updateStatus('missing', AgentStatus.OFFLINE)).toThrow(/not registered/);
    });
  });

  describe('getAll', () => {
    it('returns all registered agents as shallow copies', () => {
      const registry = AgentRegistry.getInstance();
      registry.register(makeAgent('a'));
      registry.register(makeAgent('b'));
      const all = registry.getAll();
      expect(all).toHaveLength(2);
    });
  });
});
