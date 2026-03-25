import { describe, it, expect } from 'vitest';
import { getAgentIdentity, getAllIdentities } from '../../src/messenger/agent-identity.js';
import { AgentRole } from '../../src/core/types.js';

describe('getAgentIdentity', () => {
  it('returns the correct username for RESEARCHER', () => {
    const identity = getAgentIdentity(AgentRole.RESEARCHER);
    expect(identity.username).toBe('Researcher');
  });

  it('returns the correct iconEmoji for RESEARCHER', () => {
    const identity = getAgentIdentity(AgentRole.RESEARCHER);
    expect(identity.iconEmoji).toBe(':microscope:');
  });

  it('returns the correct username for DEVELOPER', () => {
    const identity = getAgentIdentity(AgentRole.DEVELOPER);
    expect(identity.username).toBe('Developer');
  });

  it('returns the correct iconEmoji for PM', () => {
    const identity = getAgentIdentity(AgentRole.PM);
    expect(identity.iconEmoji).toBe(':clipboard:');
  });

  it('returns the correct username for QA', () => {
    const identity = getAgentIdentity(AgentRole.QA);
    expect(identity.username).toBe('QA Engineer');
  });

  it('returns an identity for every defined AgentRole', () => {
    for (const role of Object.values(AgentRole)) {
      const identity = getAgentIdentity(role);
      expect(identity.username.length).toBeGreaterThan(0);
      expect(identity.iconEmoji).toMatch(/^:.+:$/);
    }
  });

  it('returns the correct identity for TECH_WRITER', () => {
    const identity = getAgentIdentity(AgentRole.TECH_WRITER);
    expect(identity.username).toBe('Tech Writer');
    expect(identity.iconEmoji).toBe(':memo:');
  });
});

describe('getAllIdentities', () => {
  it('returns an object containing all AgentRole keys', () => {
    const all = getAllIdentities();
    for (const role of Object.values(AgentRole)) {
      expect(all[role]).toBeDefined();
    }
  });

  it('returns a copy — mutations do not affect the original', () => {
    const all = getAllIdentities();
    const original = getAgentIdentity(AgentRole.ARCHITECT);
    // @ts-expect-error intentional mutation test
    all[AgentRole.ARCHITECT] = { username: 'Hacked', iconEmoji: ':x:' };
    expect(getAgentIdentity(AgentRole.ARCHITECT)).toEqual(original);
  });
});
