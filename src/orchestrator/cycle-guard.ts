// ---------------------------------------------------------------------------
// CycleGuard — detects runaway cycles and output oscillation
// ---------------------------------------------------------------------------

export interface CycleGuardConfig {
  maxCycles: number;
  oscillationWindow: number;   // number of recent outputs to compare
  oscillationThreshold: number; // Jaccard similarity threshold (0–1)
}

const DEFAULT_CONFIG: CycleGuardConfig = {
  maxCycles: 20,
  oscillationWindow: 4,
  oscillationThreshold: 0.85,
};

// ---------------------------------------------------------------------------
// Jaccard similarity between two token sets derived from strings
// ---------------------------------------------------------------------------

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 0),
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1;
  let intersectionSize = 0;
  for (const token of a) {
    if (b.has(token)) intersectionSize += 1;
  }
  const unionSize = a.size + b.size - intersectionSize;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

// ---------------------------------------------------------------------------
// CycleGuard
// ---------------------------------------------------------------------------

export class CycleGuard {
  private readonly config: CycleGuardConfig;
  private cycleCount = 0;
  private readonly recentOutputs: string[] = [];

  constructor(config: Partial<CycleGuardConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  recordCycle(output: string): void {
    this.cycleCount += 1;
    this.recentOutputs.push(output);
    // Keep only the oscillationWindow most recent outputs
    if (this.recentOutputs.length > this.config.oscillationWindow) {
      this.recentOutputs.shift();
    }
  }

  shouldStop(): { stop: boolean; reason: string } {
    // Check max cycles
    if (this.cycleCount >= this.config.maxCycles) {
      return {
        stop: true,
        reason: `Max cycles reached: ${this.cycleCount} >= ${this.config.maxCycles}`,
      };
    }

    // Check oscillation: need at least 2 outputs to compare
    if (this.recentOutputs.length >= 2) {
      const oscillating = this._detectOscillation();
      if (oscillating) {
        return {
          stop: true,
          reason: `Oscillation detected: outputs are too similar (threshold=${this.config.oscillationThreshold}) over last ${this.recentOutputs.length} cycles`,
        };
      }
    }

    return { stop: false, reason: '' };
  }

  reset(): void {
    this.cycleCount = 0;
    this.recentOutputs.length = 0;
  }

  get cycles(): number {
    return this.cycleCount;
  }

  private _detectOscillation(): boolean {
    const outputs = this.recentOutputs;
    // All consecutive pairs must exceed threshold to declare oscillation
    const tokenSets = outputs.map(tokenize);
    for (let i = 1; i < tokenSets.length; i++) {
      const prev = tokenSets[i - 1];
      const curr = tokenSets[i];
      if (prev === undefined || curr === undefined) continue;
      const sim = jaccardSimilarity(prev, curr);
      if (sim < this.config.oscillationThreshold) return false;
    }
    return true;
  }
}
