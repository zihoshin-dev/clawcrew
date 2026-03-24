import type { Message } from '../core/types.js';

export interface Fact {
  subject: string;
  predicate: string;
  object: string;
  confidence: number;
  source: string;
}

// Pattern definitions for extracting structured facts from conversation text
interface FactPattern {
  regex: RegExp;
  predicate: string;
  subjectGroup: number;
  objectGroup: number;
  confidence: number;
}

const FACT_PATTERNS: FactPattern[] = [
  {
    regex: /(?:we\s+)?decided?\s+(?:to\s+)?(?:use\s+)?(.+?)\s+(?:for|as)\s+(.+)/i,
    predicate: 'decided_to_use',
    subjectGroup: 1,
    objectGroup: 2,
    confidence: 0.85,
  },
  {
    regex: /(?:we\s+)?prefer(?:red|s)?\s+(.+?)\s+over\s+(.+)/i,
    predicate: 'prefers',
    subjectGroup: 1,
    objectGroup: 2,
    confidence: 0.8,
  },
  {
    regex: /(?:using|use)\s+(.+?)\s+(?:as|for)\s+(?:the\s+)?(.+)/i,
    predicate: 'uses_for',
    subjectGroup: 1,
    objectGroup: 2,
    confidence: 0.75,
  },
  {
    regex: /action\s+item[:\s]+(.+)/i,
    predicate: 'action_item',
    subjectGroup: 1,
    objectGroup: 1,
    confidence: 0.9,
  },
  {
    regex: /(?:will|should|must)\s+(.+?)\s+(?:by|before|after)\s+(.+)/i,
    predicate: 'must_complete',
    subjectGroup: 1,
    objectGroup: 2,
    confidence: 0.7,
  },
  {
    regex: /(?:the\s+)?(?:technical\s+)?choice\s+(?:is|was)\s+(.+)/i,
    predicate: 'technical_choice',
    subjectGroup: 1,
    objectGroup: 1,
    confidence: 0.8,
  },
];

export class FactExtractor {
  extractFacts(conversation: Message[]): Fact[] {
    const facts: Fact[] = [];

    for (const message of conversation) {
      const messageFacts = this.extractFromText(message.content, message.agentId);
      facts.push(...messageFacts);
    }

    return facts;
  }

  private extractFromText(text: string, source: string): Fact[] {
    const facts: Fact[] = [];
    const sentences = text.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);

    for (const sentence of sentences) {
      for (const pattern of FACT_PATTERNS) {
        const match = sentence.match(pattern.regex);
        if (match !== null) {
          const subject = match[pattern.subjectGroup]?.trim() ?? '';
          const object = match[pattern.objectGroup]?.trim() ?? '';

          if (subject.length > 0) {
            facts.push({
              subject,
              predicate: pattern.predicate,
              object: object !== subject ? object : subject,
              confidence: pattern.confidence,
              source,
            });
          }
        }
      }
    }

    return facts;
  }
}
