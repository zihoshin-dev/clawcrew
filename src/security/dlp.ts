// ---------------------------------------------------------------------------
// DLP (Data Loss Prevention) Filter — detects and masks Korean PII patterns
// ---------------------------------------------------------------------------

export interface DlpPattern {
  name: string;
  regex: RegExp;
  replacement: string;
}

export interface DlpDetection {
  patternName: string;
  count: number;
}

const DEFAULT_PATTERNS: DlpPattern[] = [
  {
    name: '주민번호',
    regex: /\d{6}-[1-4]\d{6}/g,
    replacement: '[주민번호 마스킹]',
  },
  {
    name: '전화번호',
    regex: /01[016789]-?\d{3,4}-?\d{4}/g,
    replacement: '[전화번호 마스킹]',
  },
  {
    name: '이메일',
    regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    replacement: '[이메일 마스킹]',
  },
  {
    name: '카드번호',
    regex: /\d{4}-?\d{4}-?\d{4}-?\d{4}/g,
    replacement: '[카드번호 마스킹]',
  },
  {
    name: '계좌번호',
    regex: /\d{3,6}-\d{2,6}-\d{6,12}/g,
    replacement: '[계좌번호 마스킹]',
  },
];

export class DlpFilter {
  private readonly patterns: DlpPattern[];

  constructor(customPatterns?: DlpPattern[]) {
    this.patterns = [...DEFAULT_PATTERNS, ...(customPatterns ?? [])];
  }

  filter(text: string): { filtered: string; detections: DlpDetection[] } {
    const detections: DlpDetection[] = [];
    let filtered = text;

    for (const pattern of this.patterns) {
      // Reset lastIndex for global regexes before each use
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
      const matches = filtered.match(regex);
      const count = matches?.length ?? 0;

      if (count > 0) {
        detections.push({ patternName: pattern.name, count });
        filtered = filtered.replace(regex, pattern.replacement);
      }
    }

    return { filtered, detections };
  }

  hasPersonalInfo(text: string): boolean {
    for (const pattern of this.patterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags.includes('g') ? pattern.regex.flags : pattern.regex.flags + 'g');
      if (regex.test(text)) return true;
    }
    return false;
  }
}
