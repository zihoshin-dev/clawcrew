import { describe, it, expect, vi } from 'vitest';
import { LLMRouter, type LlmResponse } from '../../src/core/llm-router.js';
import { AgentRole } from '../../src/core/types.js';

function makeResponse(model: string, provider: string): LlmResponse {
  return {
    content: 'ok',
    model,
    provider,
    tokensUsed: { input: 1, output: 1, total: 2 },
    cost: 0.001,
  };
}

describe('LLMRouter config resolution', () => {
  it('reports configured provider availability from agent-only override credentials', () => {
    const router = new LLMRouter({
      agentOverrides: {
        [AgentRole.DEVELOPER]: { provider: 'openai', apiKey: 'role-key', model: 'gpt-4o-mini' },
      },
    });

    expect(router.hasConfiguredProvider(AgentRole.DEVELOPER)).toBe(true);
  });

  it('merges partial agent overrides onto default config', async () => {
    const router = new LLMRouter({
      defaultConfig: { provider: 'anthropic', apiKey: 'default-key', model: 'claude-haiku-4-5' },
      agentOverrides: {
        [AgentRole.DEVELOPER]: { model: 'claude-sonnet-4-5' },
      },
    });

    const complete = vi.fn().mockResolvedValue(makeResponse('claude-sonnet-4-5', 'anthropic'));
    (router as unknown as { getProvider: (name: string, apiKey?: string) => { complete: typeof complete } }).getProvider = vi.fn((_name: string, apiKey?: string) => {
      expect(apiKey).toBe('default-key');
      return { complete };
    });

    const response = await router.route({
      prompt: 'test',
      taskComplexity: 'medium',
      agentRole: AgentRole.DEVELOPER,
    });

    expect(complete).toHaveBeenCalledWith(expect.objectContaining({ model: 'claude-sonnet-4-5' }));
    expect(response.provider).toBe('anthropic');
  });
});
