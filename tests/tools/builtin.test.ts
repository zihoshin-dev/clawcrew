import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { webSearchTool } from '../../src/tools/builtin/web-search.js';
import { codeExecTool } from '../../src/tools/builtin/code-exec.js';
import { fileReadTool } from '../../src/tools/builtin/file-read.js';
import { directoryListTool } from '../../src/tools/builtin/directory-list.js';
import { gitStatusTool } from '../../src/tools/builtin/git-status.js';
import { createDefaultRegistry } from '../../src/tools/index.js';

describe('webSearchTool', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        AbstractText: 'Primary result',
        AbstractURL: 'https://example.com',
        RelatedTopics: [{ Text: 'Secondary result', FirstURL: 'https://example.com/secondary' }],
      }),
    } as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('has the correct name', () => {
    expect(webSearchTool.name).toBe('web_search');
  });

  it('returns search results when fetch succeeds', async () => {
    const output = await webSearchTool.execute({ query: 'test', maxResults: 1 });
    expect(output.success).toBe(true);
    expect(output.result).toEqual([{ title: 'Primary result', url: 'https://example.com' }]);
  });

  it('requires network permission', () => {
    expect(webSearchTool.requiredPermissions).toContain('network');
  });
});

describe('codeExecTool', () => {
  it('has the correct name', () => {
    expect(codeExecTool.name).toBe('code_exec');
  });

  it('executes a simple echo command successfully', async () => {
    const output = await codeExecTool.execute({ command: 'echo hello' });
    expect(output.success).toBe(true);
    expect((output.result as { stdout: string }).stdout.trim()).toBe('hello');
  });

  it('returns success: false for a failing command', async () => {
    const output = await codeExecTool.execute({ command: 'exit 1' });
    expect(output.success).toBe(false);
  });

  it('requires exec permission', () => {
    expect(codeExecTool.requiredPermissions).toContain('exec');
  });
});

describe('fileReadTool', () => {
  it('has the correct name', () => {
    expect(fileReadTool.name).toBe('file_read');
  });

  it('reads an existing file and returns its content', async () => {
    const output = await fileReadTool.execute({ path: '/Users/ziho/Desktop/ziho_dev/clawcrew/package.json' });
    expect(output.success).toBe(true);
    expect(typeof output.result).toBe('string');
    expect(output.result as string).toContain('clawcrew');
  });

  it('returns success: false for a non-existent file', async () => {
    const output = await fileReadTool.execute({ path: '/does/not/exist/file.txt' });
    expect(output.success).toBe(false);
    expect(output.error).toBeDefined();
  });
});

describe('directoryListTool', () => {
  it('lists files in the target directory', async () => {
    const output = await directoryListTool.execute({ path: '/Users/ziho/Desktop/ziho_dev/clawcrew/src/tools' });
    expect(output.success).toBe(true);
    expect(Array.isArray(output.result)).toBe(true);
    expect((output.result as Array<{ name: string }>).some((entry) => entry.name === 'index.ts')).toBe(true);
  });
});

describe('gitStatusTool', () => {
  it('returns git status output for the repo', async () => {
    const output = await gitStatusTool.execute({ cwd: '/Users/ziho/Desktop/ziho_dev/clawcrew' });
    expect(output.success).toBe(true);
    expect(typeof output.result).toBe('string');
  });
});

describe('createDefaultRegistry', () => {
  it('registers all builtin tools', () => {
    const registry = createDefaultRegistry();
    expect(registry.list()).toHaveLength(5);
  });

  it('includes the expected default tool names', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('web_search')).toBeDefined();
    expect(registry.get('code_exec')).toBeDefined();
    expect(registry.get('file_read')).toBeDefined();
    expect(registry.get('directory_list')).toBeDefined();
    expect(registry.get('git_status')).toBeDefined();
  });
});
