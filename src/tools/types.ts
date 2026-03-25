import { z } from 'zod';

export interface ToolInput {
  [key: string]: unknown;
}

export interface ToolOutput {
  success: boolean;
  result: unknown;
  error?: string;
  duration: number;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute(input: ToolInput): Promise<ToolOutput>;
  requiredPermissions?: string[];
}
