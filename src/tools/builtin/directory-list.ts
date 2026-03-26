import { readdir } from 'fs/promises';
import { z } from 'zod';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const inputSchema = z.object({
  path: z.string(),
});

export const directoryListTool: Tool = {
  name: 'directory_list',
  description: 'List files and directories at a path',
  inputSchema,
  requiredPermissions: ['fs:read'],

  async execute(input: ToolInput): Promise<ToolOutput> {
    const parsed = inputSchema.parse(input);
    const startedAt = Date.now();

    try {
      const entries = await readdir(parsed.path, { withFileTypes: true });
      return {
        success: true,
        result: entries.map((entry) => ({ name: entry.name, type: entry.isDirectory() ? 'directory' : 'file' })),
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      };
    }
  },
};
