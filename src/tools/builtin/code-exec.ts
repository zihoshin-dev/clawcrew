import { z } from 'zod';
import { SandboxExecutor } from '../../sandbox/executor.js';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const inputSchema = z.object({
  command: z.string(),
  timeout: z.number().optional(),
});

const executor = new SandboxExecutor();

export const codeExecTool: Tool = {
  name: 'code_exec',
  description: 'Execute a shell command in sandbox',
  inputSchema,
  requiredPermissions: ['exec'],

  async execute(input: ToolInput): Promise<ToolOutput> {
    const parsed = inputSchema.parse(input);
    const startedAt = Date.now();

    try {
      const result = await executor.execute(parsed.command, {
        timeout: parsed.timeout,
        cwd: process.cwd(),
      });

      return {
        success: result.exitCode === 0,
        result: { stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode },
        error: result.exitCode !== 0 ? result.stderr : undefined,
        duration: result.duration,
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
