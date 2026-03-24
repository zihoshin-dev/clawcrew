import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '../../src/sandbox/policy-engine.js';
import type { PolicySet } from '../../src/sandbox/policy-engine.js';
import { AgentRole } from '../../src/core/types.js';

const basicPolicies: PolicySet = {
  rules: [
    {
      id: 'no-delete',
      pattern: 'delete.*from',
      severity: 'block',
      reason: 'DELETE statements require review',
    },
    {
      id: 'warn-truncate',
      pattern: 'truncate',
      severity: 'warn',
      reason: 'TRUNCATE removes all rows',
    },
    {
      id: 'dev-kubectl-block',
      pattern: 'kubectl apply',
      severity: 'block',
      reason: 'Deployment restricted to DevOps role',
      roles: [AgentRole.DEVELOPER],
    },
  ],
};

describe('PolicyEngine', () => {
  describe('global rules', () => {
    it('blocks a command matching a block-severity rule', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('DELETE FROM users WHERE id=1', AgentRole.DEVELOPER);
      expect(result.allowed).toBe(false);
      expect(result.severity).toBe('block');
      expect(result.reason).toBe('DELETE statements require review');
    });

    it('warns on a command matching a warn-severity rule', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('TRUNCATE TABLE logs', AgentRole.DEVELOPER);
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('warn');
    });

    it('allows a command that matches no rules', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('SELECT * FROM users', AgentRole.DEVELOPER);
      expect(result.allowed).toBe(true);
      expect(result.severity).toBe('info');
    });

    it('performs case-insensitive matching', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('delete from users', AgentRole.DEVELOPER);
      expect(result.allowed).toBe(false);
    });
  });

  describe('role-scoped rules', () => {
    it('blocks a command only for the restricted role', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('kubectl apply -f deploy.yaml', AgentRole.DEVELOPER);
      expect(result.allowed).toBe(false);
    });

    it('allows the same command for a role that is not restricted', () => {
      const engine = new PolicyEngine(basicPolicies);
      const result = engine.validate('kubectl apply -f deploy.yaml', AgentRole.DEVOPS);
      expect(result.allowed).toBe(true);
    });
  });

  describe('role permissions — blocked patterns', () => {
    it('blocks commands matching role-specific blocked patterns', () => {
      const policies: PolicySet = {
        rules: [],
        rolePermissions: {
          [AgentRole.QA]: { blockedPatterns: ['git push'] },
        },
      };
      const engine = new PolicyEngine(policies);
      const result = engine.validate('git push origin main', AgentRole.QA);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/blocked by role policy/i);
    });
  });

  describe('role permissions — allowed patterns (whitelist)', () => {
    it('blocks a command not in the allowed-patterns whitelist', () => {
      const policies: PolicySet = {
        rules: [],
        rolePermissions: {
          [AgentRole.DESIGNER]: { allowedPatterns: ['figma', 'sketch'] },
        },
      };
      const engine = new PolicyEngine(policies);
      const result = engine.validate('rm -rf /dist', AgentRole.DESIGNER);
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/not in allowed patterns/i);
    });

    it('allows a command matching the allowed-patterns whitelist', () => {
      const policies: PolicySet = {
        rules: [],
        rolePermissions: {
          [AgentRole.DESIGNER]: { allowedPatterns: ['figma', 'sketch'] },
        },
      };
      const engine = new PolicyEngine(policies);
      const result = engine.validate('open figma design.fig', AgentRole.DESIGNER);
      expect(result.allowed).toBe(true);
    });
  });

  describe('getRules', () => {
    it('returns all configured rules', () => {
      const engine = new PolicyEngine(basicPolicies);
      expect(engine.getRules()).toHaveLength(basicPolicies.rules.length);
    });
  });
});
