import { createHash } from 'crypto';
import type { LlmResponse } from './llm-router.js';

export interface CacheEntry {
  response: LlmResponse;
  cachedAt: number;
  ttlMs: number;
}

export class LlmCache {
  private readonly store = new Map<string, CacheEntry>();
  private hits = 0;
  private misses = 0;

  constructor(private readonly defaultTtlMs: number = 3_600_000) {}

  private generateKey(prompt: string, systemPrompt: string, model: string): string {
    return createHash('sha256')
      .update(`${systemPrompt}||${prompt}||${model}`)
      .digest('hex');
  }

  get(prompt: string, systemPrompt: string, model: string): LlmResponse | undefined {
    const key = this.generateKey(prompt, systemPrompt, model);
    const entry = this.store.get(key);
    if (entry === undefined) {
      this.misses += 1;
      return undefined;
    }
    if (Date.now() - entry.cachedAt > entry.ttlMs) {
      this.store.delete(key);
      this.misses += 1;
      return undefined;
    }
    this.hits += 1;
    return entry.response;
  }

  set(prompt: string, systemPrompt: string, model: string, response: LlmResponse): void {
    const key = this.generateKey(prompt, systemPrompt, model);
    this.store.set(key, { response, cachedAt: Date.now(), ttlMs: this.defaultTtlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
    this.hits = 0;
    this.misses = 0;
  }

  stats(): { hits: number; misses: number; size: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      size: this.store.size,
      hitRate: total === 0 ? 0 : this.hits / total,
    };
  }
}
