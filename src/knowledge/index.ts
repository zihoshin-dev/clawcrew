export {
  type OrgCulture,
  getCulture,
  getAllCultures,
  getRelevantPrinciples,
} from './org-culture.js';

export {
  type LeaderWisdom,
  getWisdom,
  getAllWisdom,
  getDecisionAdvice,
} from './leadership-wisdom.js';

export {
  type WorkPattern,
  type PatternCategory,
  getPattern,
  getAllPatterns,
  getPatternsByCategory,
  recommendPattern,
} from './work-patterns.js';

import type { WorkPattern } from './work-patterns.js';
import { getRelevantPrinciples } from './org-culture.js';
import { getDecisionAdvice } from './leadership-wisdom.js';
import { recommendPattern } from './work-patterns.js';

export class KnowledgeEngine {
  queryForContext(situation: string): {
    principles: string[];
    advice: string[];
    patterns: WorkPattern[];
  } {
    return {
      principles: getRelevantPrinciples(situation),
      advice: getDecisionAdvice(situation),
      patterns: recommendPattern(3, situation, 'medium'),
    };
  }
}
