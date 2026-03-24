import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface MemoryMetadata {
  createdAt: Date;
  createdBy: string;
  tags: string[];
  expiresAt?: Date;
}

export interface MemoryEntry {
  key: string;
  value: unknown;
  metadata: MemoryMetadata;
}

// Serialised form stored on disk (dates as ISO strings)
interface SerializedEntry {
  key: string;
  value: unknown;
  metadata: {
    createdAt: string;
    createdBy: string;
    tags: string[];
    expiresAt?: string;
  };
}

export class MemoryStore {
  private readonly entries: Map<string, MemoryEntry> = new Map();
  private readonly filePath: string;

  constructor(filePath: string = 'data/memory.json') {
    this.filePath = filePath;
    this.loadFromDisk();
  }

  save(key: string, value: unknown, metadata?: Partial<MemoryMetadata>): void {
    const entry: MemoryEntry = {
      key,
      value,
      metadata: {
        createdAt: new Date(),
        createdBy: metadata?.createdBy ?? 'system',
        tags: metadata?.tags ?? [],
        expiresAt: metadata?.expiresAt,
      },
    };
    this.entries.set(key, entry);
    this.persistToDisk();
  }

  query(pattern: string): MemoryEntry[] {
    const now = new Date();
    const regex = new RegExp(pattern, 'i');
    return Array.from(this.entries.values())
      .filter((e) => {
        if (e.metadata.expiresAt !== undefined && e.metadata.expiresAt < now) {
          return false;
        }
        return regex.test(e.key) || e.metadata.tags.some((tag) => regex.test(tag));
      })
      .map((e) => this.cloneEntry(e));
  }

  forget(key: string): void {
    this.entries.delete(key);
    this.persistToDisk();
  }

  summarize(keys: string[]): string {
    const found: MemoryEntry[] = [];
    for (const key of keys) {
      const entry = this.entries.get(key);
      if (entry !== undefined) {
        found.push(entry);
      }
    }
    if (found.length === 0) {
      return 'No entries found for the given keys.';
    }
    return found
      .map((e) => `[${e.key}] (tags: ${e.metadata.tags.join(', ') || 'none'}): ${JSON.stringify(e.value)}`)
      .join('\n');
  }

  getAll(): MemoryEntry[] {
    return Array.from(this.entries.values()).map((e) => this.cloneEntry(e));
  }

  private cloneEntry(e: MemoryEntry): MemoryEntry {
    return {
      ...e,
      metadata: { ...e.metadata },
    };
  }

  private loadFromDisk(): void {
    if (!existsSync(this.filePath)) return;
    try {
      const raw = readFileSync(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as SerializedEntry[];
      for (const item of parsed) {
        this.entries.set(item.key, {
          key: item.key,
          value: item.value,
          metadata: {
            createdAt: new Date(item.metadata.createdAt),
            createdBy: item.metadata.createdBy,
            tags: item.metadata.tags,
            expiresAt:
              item.metadata.expiresAt !== undefined
                ? new Date(item.metadata.expiresAt)
                : undefined,
          },
        });
      }
    } catch {
      // corrupt file — start fresh
      this.entries.clear();
    }
  }

  private persistToDisk(): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    const serialized: SerializedEntry[] = Array.from(this.entries.values()).map((e) => ({
      key: e.key,
      value: e.value,
      metadata: {
        createdAt: e.metadata.createdAt.toISOString(),
        createdBy: e.metadata.createdBy,
        tags: e.metadata.tags,
        expiresAt: e.metadata.expiresAt?.toISOString(),
      },
    }));
    writeFileSync(this.filePath, JSON.stringify(serialized, null, 2), 'utf-8');
  }
}
