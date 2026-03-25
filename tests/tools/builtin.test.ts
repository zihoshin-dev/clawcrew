import { describe, it, expect } from 'vitest';
import { webSearchTool } from '../../src/tools/builtin/web-search.js';
import { codeExecTool } from '../../src/tools/builtin/code-exec.js';
import { fileReadTool } from '../../src/tools/builtin/file-read.js';
import { createDefaultRegistry } from '../../src/tools/index.js';

describe('webSearchTool', () => {
  it('has the correct name', () => {
    expect(webSearchTool.name).toBe('web_search');
  });

  it('returns success: false with "not configured" error', async () => {
    const output = await webSearchTool.execute({ query: 'test' });
    expect(output.success).toBe(false);
    expect(output.error).toMatch(/not configured/i);
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

describe('createDefaultRegistry', () => {
  it('registers all three builtin tools', () => {
    const registry = createDefaultRegistry();
    expect(registry.list()).toHaveLength(3);
  });

  it('includes web_search, code_exec, and file_read', () => {
    const registry = createDefaultRegistry();
    expect(registry.get('web_search')).toBeDefined();
    expect(registry.get('code_exec')).toBeDefined();
    expect(registry.get('file_read')).toBeDefined();
  });
});
