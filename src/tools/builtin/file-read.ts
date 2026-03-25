import { z } from 'zod';
import { readFile } from 'fs/promises';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const inputSchema = z.object({
  path: z.string(),
});

export const fileReadTool: Tool = {
  name: 'file_read',
  description: 'Read a file from the project directory',
  inputSchema,
  requiredPermissions: ['fs:read'],

  async execute(input: ToolInput): Promise<ToolOutput> {
    const parsed = inputSchema.parse(input);
    const startedAt = Date.now();

    try {
      const content = await readFile(parsed.path, 'utf-8');
      return {
        success: true,
        result: content,
        duration: Date.now() - startedAt,
      };
    } catch (err) {
      return {
        success: false,
        result: null,
        error: err instanceof Error ? err.message : String(err),
        duration: Date.now() - startedAt,
      };
    }
  },
};
