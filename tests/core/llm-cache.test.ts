import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LlmCache } from '../../src/core/llm-cache.js';
import type { LlmResponse } from '../../src/core/llm-router.js';

function makeResponse(content = 'hello'): LlmResponse {
  return {
    content,
    model: 'claude-haiku',
    provider: 'anthropic',
    tokensUsed: { input: 10, output: 5, total: 15 },
    cost: 0.0001,
  };
}

describe('LlmCache', () => {
  let cache: LlmCache;

  beforeEach(() => {
    cache = new LlmCache(3_600_000);
  });

  it('returns undefined on cache miss', () => {
    expect(cache.get('prompt', 'system', 'model')).toBeUndefined();
  });

  it('returns cached response on hit', () => {
    const resp = makeResponse('cached');
    cache.set('prompt', 'system', 'model', resp);
    const hit = cache.get('prompt', 'system', 'model');
    expect(hit).toBeDefined();
    expect(hit!.content).toBe('cached');
  });

  it('differentiates entries by prompt', () => {
    cache.set('prompt-A', 'sys', 'model', makeResponse('A'));
    cache.set('prompt-B', 'sys', 'model', makeResponse('B'));
    expect(cache.get('prompt-A', 'sys', 'model')!.content).toBe('A');
    expect(cache.get('prompt-B', 'sys', 'model')!.content).toBe('B');
  });

  it('differentiates entries by systemPrompt', () => {
    cache.set('prompt', 'sys-1', 'model', makeResponse('S1'));
    cache.set('prompt', 'sys-2', 'model', makeResponse('S2'));
    expect(cache.get('prompt', 'sys-1', 'model')!.content).toBe('S1');
    expect(cache.get('prompt', 'sys-2', 'model')!.content).toBe('S2');
  });

  it('differentiates entries by model', () => {
    cache.set('prompt', 'sys', 'model-A', makeResponse('MA'));
    cache.set('prompt', 'sys', 'model-B', makeResponse('MB'));
    expect(cache.get('prompt', 'sys', 'model-A')!.content).toBe('MA');
    expect(cache.get('prompt', 'sys', 'model-B')!.content).toBe('MB');
  });

  it('expires entries after TTL', () => {
    const shortCache = new LlmCache(1); // 1ms TTL
    shortCache.set('p', 's', 'm', makeResponse());
    // Simulate time passing beyond TTL
    vi.useFakeTimers();
    vi.advanceTimersByTime(10);
    expect(shortCache.get('p', 's', 'm')).toBeUndefined();
    vi.useRealTimers();
  });

  it('clear() removes all entries and resets stats', () => {
    cache.set('p', 's', 'm', makeResponse());
    cache.get('p', 's', 'm'); // hit
    cache.clear();
    expect(cache.stats().size).toBe(0);
    expect(cache.stats().hits).toBe(0);
    expect(cache.stats().misses).toBe(0);
  });

  it('stats() tracks hits and misses', () => {
    cache.set('p', 's', 'm', makeResponse());
    cache.get('p', 's', 'm'); // hit
    cache.get('p2', 's', 'm'); // miss
    const s = cache.stats();
    expect(s.hits).toBe(1);
    expect(s.misses).toBe(1);
    expect(s.size).toBe(1);
  });

  it('hitRate is 0 when no requests made', () => {
    expect(cache.stats().hitRate).toBe(0);
  });

  it('hitRate reflects correct ratio', () => {
    cache.set('p', 's', 'm', makeResponse());
    cache.get('p', 's', 'm'); // hit
    cache.get('p', 's', 'm'); // hit
    cache.get('miss', 's', 'm'); // miss
    expect(cache.stats().hitRate).toBeCloseTo(2 / 3);
  });
});
