import { execFile } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const execFileAsync = promisify(execFile);

const inputSchema = z.object({
  cwd: z.string().optional(),
});

export const gitStatusTool: Tool = {
  name: 'git_status',
  description: 'Read the current git status for a repository',
  inputSchema,
  requiredPermissions: ['git:read'],

  async execute(input: ToolInput): Promise<ToolOutput> {
    const parsed = inputSchema.parse(input);
    const startedAt = Date.now();

    try {
      const result = await execFileAsync('git', ['status', '--short', '--branch'], {
        cwd: parsed.cwd ?? process.cwd(),
      });
      return {
        success: true,
        result: result.stdout,
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        result: null,
        error: message,
        duration: Date.now() - startedAt,
      };
    }
  },
};
