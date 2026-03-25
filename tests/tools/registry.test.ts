import { describe, it, expect, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolRegistry } from '../../src/tools/registry.js';
import type { Tool, ToolInput, ToolOutput } from '../../src/tools/types.js';

function makeTool(name: string, permissions: string[] = []): Tool {
  return {
    name,
    description: `Tool ${name}`,
    inputSchema: z.object({ value: z.string() }),
    requiredPermissions: permissions,
    async execute(_input: ToolInput): Promise<ToolOutput> {
      return { success: true, result: name, duration: 0 };
    },
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('registers a tool and retrieves it by name', () => {
    const tool = makeTool('alpha');
    registry.register(tool);
    expect(registry.get('alpha')).toBe(tool);
  });

  it('returns undefined for an unregistered tool name', () => {
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('lists all registered tools', () => {
    registry.register(makeTool('a'));
    registry.register(makeTool('b'));
    expect(registry.list()).toHaveLength(2);
  });

  it('returns an empty list when no tools are registered', () => {
    expect(registry.list()).toHaveLength(0);
  });

  it('unregisters a tool by name', () => {
    registry.register(makeTool('beta'));
    registry.unregister('beta');
    expect(registry.get('beta')).toBeUndefined();
  });

  it('silently ignores unregistering a non-existent tool', () => {
    expect(() => registry.unregister('ghost')).not.toThrow();
  });

  it('filters tools by required permission', () => {
    registry.register(makeTool('with-exec', ['exec']));
    registry.register(makeTool('with-network', ['network']));
    registry.register(makeTool('no-perms'));
    const execTools = registry.getByPermission('exec');
    expect(execTools).toHaveLength(1);
    expect(execTools[0]?.name).toBe('with-exec');
  });

  it('returns empty array when no tools match the permission', () => {
    registry.register(makeTool('tool-a', ['fs:read']));
    expect(registry.getByPermission('network')).toHaveLength(0);
  });

  it('overwrites a previously registered tool with the same name', () => {
    const first = makeTool('dup');
    const second = makeTool('dup');
    registry.register(first);
    registry.register(second);
    expect(registry.list()).toHaveLength(1);
    expect(registry.get('dup')).toBe(second);
  });
});
