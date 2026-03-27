import { z } from 'zod';
import type { Tool, ToolInput, ToolOutput } from '../types.js';

const inputSchema = z.object({
  query: z.string(),
  maxResults: z.number().positive().max(10).optional(),
});

export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web via DuckDuckGo instant answer API',
  inputSchema,
  requiredPermissions: ['network'],

  async execute(input: ToolInput): Promise<ToolOutput> {
    const parsed = inputSchema.parse(input);
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    try {
      const response = await fetch(
        `https://api.duckduckgo.com/?q=${encodeURIComponent(parsed.query)}&format=json&no_html=1&skip_disambig=1`,
        { signal: controller.signal },
      );
      const data = (await response.json()) as DuckDuckGoResponse;
      const results = extractResults(data).slice(0, parsed.maxResults ?? 5);

      return {
        success: true,
        result: results,
        duration: Date.now() - startedAt,
      };
    } catch (error) {
      return {
        success: false,
        result: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startedAt,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};

interface DuckDuckGoResponse {
  AbstractText?: string;
  AbstractURL?: string;
  RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Topics?: Array<{ Text?: string; FirstURL?: string }> }>;
}

function extractResults(data: DuckDuckGoResponse): Array<{ title: string; url?: string }> {
  const results: Array<{ title: string; url?: string }> = [];

  if (data.AbstractText !== undefined && data.AbstractText.length > 0) {
    results.push({ title: data.AbstractText, url: data.AbstractURL });
  }

  for (const topic of data.RelatedTopics ?? []) {
    if (topic.Text !== undefined) {
      results.push({ title: topic.Text, url: topic.FirstURL });
    }
    for (const nested of topic.Topics ?? []) {
      if (nested.Text !== undefined) {
        results.push({ title: nested.Text, url: nested.FirstURL });
      }
    }
  }

  return results;
}
