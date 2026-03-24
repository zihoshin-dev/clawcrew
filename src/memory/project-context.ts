import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { MemoryStore } from './store.js';
import { DecisionLog } from './decision-log.js';
import type { Decision } from './decision-log.js';

export interface CodebaseState {
  projectDir: string;
  fileCount: number;
  languages: string[];
  topLevelDirs: string[];
  hasPackageJson: boolean;
  hasTsConfig: boolean;
  hasGitRepo: boolean;
}

export class ProjectContext {
  private readonly memoryStore: MemoryStore;
  private readonly decisionLog: DecisionLog;
  private codebaseState: CodebaseState | null = null;
  private conversationSummary: string = '';

  constructor(memoryStore?: MemoryStore, decisionLog?: DecisionLog) {
    this.memoryStore = memoryStore ?? new MemoryStore();
    this.decisionLog = decisionLog ?? new DecisionLog();
  }

  async loadFromDisk(projectDir: string): Promise<void> {
    this.codebaseState = this.scanCodebase(projectDir);

    // Load any persisted memory entries tagged as 'conversation'
    const conversationEntries = this.memoryStore.query('conversation');
    if (conversationEntries.length > 0) {
      this.conversationSummary = conversationEntries
        .map((e) => String(e.value))
        .join('\n');
    }
  }

  getCodebaseState(): CodebaseState {
    if (this.codebaseState === null) {
      throw new Error('Call loadFromDisk() before getCodebaseState()');
    }
    return { ...this.codebaseState };
  }

  getConversationSummary(): string {
    return this.conversationSummary;
  }

  getRecentDecisions(n: number = 10): Decision[] {
    return this.decisionLog.getRecent(n);
  }

  getMemoryStore(): MemoryStore {
    return this.memoryStore;
  }

  getDecisionLog(): DecisionLog {
    return this.decisionLog;
  }

  private scanCodebase(projectDir: string): CodebaseState {
    if (!existsSync(projectDir)) {
      return {
        projectDir,
        fileCount: 0,
        languages: [],
        topLevelDirs: [],
        hasPackageJson: false,
        hasTsConfig: false,
        hasGitRepo: false,
      };
    }

    const entries = readdirSync(projectDir);
    const topLevelDirs = entries.filter((e) => {
      try {
        return statSync(join(projectDir, e)).isDirectory() && !e.startsWith('.');
      } catch {
        return false;
      }
    });

    const extensionCounts = new Map<string, number>();
    let fileCount = 0;

    this.walkDir(projectDir, (filePath) => {
      fileCount++;
      const ext = extname(filePath).toLowerCase();
      if (ext) {
        extensionCounts.set(ext, (extensionCounts.get(ext) ?? 0) + 1);
      }
    });

    const EXT_TO_LANG: Record<string, string> = {
      '.ts': 'TypeScript',
      '.tsx': 'TypeScript',
      '.js': 'JavaScript',
      '.jsx': 'JavaScript',
      '.py': 'Python',
      '.go': 'Go',
      '.rs': 'Rust',
      '.java': 'Java',
      '.cs': 'C#',
      '.rb': 'Ruby',
    };

    const languages = Array.from(extensionCounts.keys())
      .filter((ext) => EXT_TO_LANG[ext] !== undefined)
      .sort((a, b) => (extensionCounts.get(b) ?? 0) - (extensionCounts.get(a) ?? 0))
      .map((ext) => EXT_TO_LANG[ext] as string)
      .filter((lang, idx, arr) => arr.indexOf(lang) === idx);

    return {
      projectDir,
      fileCount,
      languages,
      topLevelDirs,
      hasPackageJson: existsSync(join(projectDir, 'package.json')),
      hasTsConfig: existsSync(join(projectDir, 'tsconfig.json')),
      hasGitRepo: existsSync(join(projectDir, '.git')),
    };
  }

  private walkDir(dir: string, callback: (filePath: string) => void, depth: number = 0): void {
    if (depth > 5) return;
    const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.cache']);
    try {
      const entries = readdirSync(dir);
      for (const entry of entries) {
        const fullPath = join(dir, entry);
        try {
          const stat = statSync(fullPath);
          if (stat.isDirectory()) {
            if (!SKIP_DIRS.has(entry)) {
              this.walkDir(fullPath, callback, depth + 1);
            }
          } else {
            callback(fullPath);
          }
        } catch {
          // skip unreadable entries
        }
      }
    } catch {
      // skip unreadable directories
    }
  }
}
