import { describe, it, expect } from 'vitest';
import { MemoryStore } from '../../src/memory/store.js';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

function makeTempStore(): { store: MemoryStore; dir: string } {
  const dir = mkdtempSync(join(tmpdir(), 'clawcrew-test-'));
  const store = new MemoryStore(join(dir, 'memory.json'));
  return { store, dir };
}

describe('MemoryStore', () => {
  describe('save and retrieve', () => {
    it('saves a value that can be found via query on the key', () => {
      const { store, dir } = makeTempStore();
      store.save('project:tech-stack', { db: 'postgres' });
      const results = store.query('project:tech-stack');
      expect(results).toHaveLength(1);
      expect(results[0]!.value).toEqual({ db: 'postgres' });
      rmSync(dir, { recursive: true });
    });

    it('stores the createdBy field in metadata', () => {
      const { store, dir } = makeTempStore();
      store.save('key', 'value', { createdBy: 'agent-1' });
      const results = store.query('key');
      expect(results[0]!.metadata.createdBy).toBe('agent-1');
      rmSync(dir, { recursive: true });
    });

    it('stores tags and allows querying by tag', () => {
      const { store, dir } = makeTempStore();
      store.save('decision:auth', 'use JWT', { tags: ['auth', 'security'] });
      const results = store.query('security');
      expect(results).toHaveLength(1);
      expect(results[0]!.key).toBe('decision:auth');
      rmSync(dir, { recursive: true });
    });

    it('overwrites an existing key with a new value', () => {
      const { store, dir } = makeTempStore();
      store.save('key', 'original');
      store.save('key', 'updated');
      const results = store.query('key');
      expect(results).toHaveLength(1);
      expect(results[0]!.value).toBe('updated');
      rmSync(dir, { recursive: true });
    });
  });

  describe('query', () => {
    it('returns an empty array when pattern matches nothing', () => {
      const { store, dir } = makeTempStore();
      store.save('known-key', 'v');
      expect(store.query('xyz-not-here')).toHaveLength(0);
      rmSync(dir, { recursive: true });
    });

    it('performs case-insensitive matching', () => {
      const { store, dir } = makeTempStore();
      store.save('Project:TECH', 'val');
      expect(store.query('project:tech')).toHaveLength(1);
      rmSync(dir, { recursive: true });
    });

    it('excludes expired entries', () => {
      const { store, dir } = makeTempStore();
      const pastDate = new Date(Date.now() - 1000);
      store.save('expired-key', 'v', { expiresAt: pastDate });
      expect(store.query('expired-key')).toHaveLength(0);
      rmSync(dir, { recursive: true });
    });

    it('includes entries whose expiry is in the future', () => {
      const { store, dir } = makeTempStore();
      const futureDate = new Date(Date.now() + 60_000);
      store.save('fresh-key', 'v', { expiresAt: futureDate });
      expect(store.query('fresh-key')).toHaveLength(1);
      rmSync(dir, { recursive: true });
    });
  });

  describe('forget', () => {
    it('removes an entry so it no longer appears in queries', () => {
      const { store, dir } = makeTempStore();
      store.save('remove-me', 'gone');
      store.forget('remove-me');
      expect(store.query('remove-me')).toHaveLength(0);
      rmSync(dir, { recursive: true });
    });
  });

  describe('summarize', () => {
    it('returns a formatted summary containing key and value', () => {
      const { store, dir } = makeTempStore();
      store.save('db', 'postgres', { tags: ['infra'] });
      const summary = store.summarize(['db']);
      expect(summary).toContain('db');
      expect(summary).toContain('postgres');
      rmSync(dir, { recursive: true });
    });

    it('returns a "No entries found" message for unknown keys', () => {
      const { store, dir } = makeTempStore();
      const summary = store.summarize(['ghost']);
      expect(summary).toMatch(/no entries found/i);
      rmSync(dir, { recursive: true });
    });
  });

  describe('persistence', () => {
    it('reloads entries from disk when a new MemoryStore is created at the same path', () => {
      const dir = mkdtempSync(join(tmpdir(), 'clawcrew-persist-'));
      const filePath = join(dir, 'mem.json');
      const store1 = new MemoryStore(filePath);
      store1.save('persist-key', { hello: 'world' });

      const store2 = new MemoryStore(filePath);
      const results = store2.query('persist-key');
      expect(results).toHaveLength(1);
      expect(results[0]!.value).toEqual({ hello: 'world' });
      rmSync(dir, { recursive: true });
    });
  });
});
