import type { AgentRole, Phase } from '../core/types.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskComplexity = 'trivial' | 'simple' | 'moderate' | 'complex';

export interface PhaseTeamConfig {
  required: string[];
  optional?: string[];
}

export interface TeamRecommendation {
  roles: AgentRole[];
  reasoning: string;
}

// ---------------------------------------------------------------------------
// Keywords for complexity classification
// ---------------------------------------------------------------------------

const TRIVIAL_PATTERNS = [
  /^fix (a )?typo/i,
  /^rename/i,
  /^update (a )?(comment|readme|doc)/i,
  /^bump version/i,
];

const COMPLEX_KEYWORDS = [
  'architect',
  'architecture',
  'security',
  'authentication',
  'authorization',
  'multi-system',
  'multi system',
  'distributed',
  'migration',
  'database migration',
  'infrastructure',
  'performance',
  'scalab',
  'redesign',
  'overhaul',
  'refactor',
  'breaking change',
];

const SIMPLE_KEYWORDS = [
  'fix',
  'bug',
  'patch',
  'typo',
  'small',
  'minor',
  'update',
  'tweak',
  'adjust',
  'correct',
];

// ---------------------------------------------------------------------------
// TeamSizer
// ---------------------------------------------------------------------------

export class TeamSizer {
  constructor(
    private readonly phaseTeams: Record<string, PhaseTeamConfig>,
  ) {}

  recommend(agenda: string, phase: Phase): TeamRecommendation {
    const complexity = this.classifyComplexity(agenda);
    const phaseConfig = this.phaseTeams[phase as string];

    if (phaseConfig === undefined) {
      return {
        roles: ['DEVELOPER' as AgentRole],
        reasoning: `No phase config for ${phase}; defaulting to single DEVELOPER.`,
      };
    }

    const required = phaseConfig.required as AgentRole[];
    const optional = (phaseConfig.optional ?? []) as AgentRole[];

    switch (complexity) {
      case 'trivial':
        // Single developer for trivial tasks
        return {
          roles: ['DEVELOPER' as AgentRole],
          reasoning: `Trivial task detected ("${agenda.slice(0, 50)}"); spawning single DEVELOPER.`,
        };

      case 'simple':
        return {
          roles: [...required],
          reasoning: `Simple task; spawning required roles only: ${required.join(', ')}.`,
        };

      case 'moderate':
        // required + first optional
        const moderateRoles = optional.length > 0
          ? [...required, optional[0] as AgentRole]
          : [...required];
        return {
          roles: moderateRoles,
          reasoning: `Moderate complexity; spawning required + 1 optional: ${moderateRoles.join(', ')}.`,
        };

      case 'complex':
        return {
          roles: [...required, ...optional],
          reasoning: `Complex task; spawning full team: ${[...required, ...optional].join(', ')}.`,
        };
    }
  }

  classifyComplexity(agenda: string): TaskComplexity {
    const lower = agenda.toLowerCase().trim();
    const wordCount = lower.split(/\s+/).length;

    // Trivial: ≤10 words OR matches trivial patterns
    if (wordCount <= 10) {
      for (const pattern of TRIVIAL_PATTERNS) {
        if (pattern.test(lower)) return 'trivial';
      }
    }

    if (wordCount <= 5) {
      return 'trivial';
    }

    // Complex: contains complex keywords
    for (const kw of COMPLEX_KEYWORDS) {
      if (lower.includes(kw)) return 'complex';
    }

    // Simple: contains simple keywords and short
    let simpleScore = 0;
    for (const kw of SIMPLE_KEYWORDS) {
      if (lower.includes(kw)) simpleScore += 1;
    }
    if (simpleScore >= 1 && wordCount <= 20) return 'simple';

    // Default: moderate
    return 'moderate';
  }
}
