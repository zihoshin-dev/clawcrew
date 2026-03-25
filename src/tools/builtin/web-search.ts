import { z } from 'zod';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const inputSchema = z.object({
  query: z.string(),
  maxResults: z.number().optional(),
});

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web for information',
  inputSchema,
  requiredPermissions: ['network'],

  async execute(_input: ToolInput): Promise<ToolOutput> {
    const startedAt = Date.now();
    return {
      success: false,
      result: null,
      error: 'Web search not configured',
      duration: Date.now() - startedAt,
    };
  },
};
