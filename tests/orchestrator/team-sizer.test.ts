import { describe, it, expect, beforeEach } from 'vitest';
import { createRequire } from 'module';
import { TeamSizer } from '../../src/orchestrator/team-sizer.js';
import { Phase } from '../../src/core/types.js';

const require = createRequire(import.meta.url);
const phaseTeams = require('../../config/phase-teams.json') as Record<string, { required: string[]; optional?: string[] }>;

const sizer = new TeamSizer(phaseTeams);

describe('TeamSizer.classifyComplexity', () => {
  it('classifies very short agendas as trivial', () => {
    expect(sizer.classifyComplexity('fix typo')).toBe('trivial');
  });

  it('classifies 5-word or fewer agendas as trivial', () => {
    expect(sizer.classifyComplexity('add a log line')).toBe('trivial');
  });

  it('classifies bug fix agendas as simple', () => {
    expect(sizer.classifyComplexity('fix the login bug in the user service')).toBe('simple');
  });

  it('classifies agendas with complex keywords as complex', () => {
    expect(sizer.classifyComplexity('redesign the authentication architecture for the entire system')).toBe('complex');
  });

  it('classifies security-related agendas as complex', () => {
    expect(sizer.classifyComplexity('implement security audit for all endpoints')).toBe('complex');
  });

  it('defaults to moderate for mid-length agendas without strong signals', () => {
    expect(sizer.classifyComplexity('implement a new dashboard feature with charts and filters for the analytics page')).toBe('moderate');
  });
});

describe('TeamSizer.recommend', () => {
  it('trivial task returns single DEVELOPER regardless of phase', () => {
    const result = sizer.recommend('fix typo', Phase.CODE);
    expect(result.roles).toEqual(['DEVELOPER']);
    expect(result.reasoning).toMatch(/trivial/i);
  });

  it('simple task returns only required roles for the phase', () => {
    const result = sizer.recommend('fix the login bug in the user service', Phase.CODE);
    expect(result.roles).toEqual(['DEVELOPER']);
    expect(result.reasoning).toMatch(/simple/i);
  });

  it('moderate task returns required + 1 optional for RESEARCH phase', () => {
    const result = sizer.recommend('investigate performance bottlenecks and document findings thoroughly', Phase.RESEARCH);
    // RESEARCH required: RESEARCHER, ANALYST; optional: PM → moderate gets required + first optional
    expect(result.roles).toContain('RESEARCHER');
    expect(result.roles).toContain('ANALYST');
    expect(result.roles).toContain('PM');
    expect(result.roles).toHaveLength(3);
  });

  it('complex task returns required + all optional', () => {
    const result = sizer.recommend('redesign the distributed architecture and security model', Phase.CODE);
    // CODE required: DEVELOPER; optional: ARCHITECT, SECURITY
    expect(result.roles).toContain('DEVELOPER');
    expect(result.roles).toContain('ARCHITECT');
    expect(result.roles).toContain('SECURITY');
    expect(result.reasoning).toMatch(/complex/i);
  });

  it('returns correct required roles for PLAN phase on simple task', () => {
    const result = sizer.recommend('fix the sprint planning bug that causes incorrect velocity calculation', Phase.PLAN);
    expect(result.roles).toContain('PM');
    expect(result.roles).toContain('ARCHITECT');
  });

  it('returns DEVELOPER fallback for unknown phase', () => {
    const result = sizer.recommend('fix typo in readme', 'UNKNOWN' as Phase);
    expect(result.roles).toEqual(['DEVELOPER']);
  });
});
