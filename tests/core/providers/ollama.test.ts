import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaProvider } from '../../../src/core/providers/ollama.js';

describe('OllamaProvider', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('sends correct request format to Ollama API', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'llama3',
        response: 'Hello!',
        prompt_eval_count: 10,
        eval_count: 5,
      }),
    } as Response);

    const provider = new OllamaProvider();
    await provider.complete({
      prompt: 'Say hello',
      systemPrompt: 'You are helpful',
      taskComplexity: 'low',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:11434/api/generate',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('"prompt":"Say hello"'),
      }),
    );
    const callBody = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string);
    expect(callBody.model).toBe('llama3');
    expect(callBody.system).toBe('You are helpful');
    expect(callBody.stream).toBe(false);
  });

  it('maps Ollama response to LlmResponse format', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        model: 'llama3',
        response: 'Test response',
        prompt_eval_count: 20,
        eval_count: 10,
      }),
    } as Response);

    const provider = new OllamaProvider();
    const result = await provider.complete({ prompt: 'test', taskComplexity: 'low' });

    expect(result.content).toBe('Test response');
    expect(result.model).toBe('llama3');
    expect(result.provider).toBe('ollama');
    expect(result.tokensUsed).toEqual({ input: 20, output: 10, total: 30 });
    expect(result.cost).toBe(0);
  });

  it('uses custom baseUrl when provided', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ model: 'llama3', response: 'ok', prompt_eval_count: 0, eval_count: 0 }),
    } as Response);

    const provider = new OllamaProvider('http://remote-host:11434');
    await provider.complete({ prompt: 'hi', taskComplexity: 'low' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://remote-host:11434/api/generate',
      expect.anything(),
    );
  });

  it('throws when Ollama returns a non-ok response', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const provider = new OllamaProvider();
    await expect(
      provider.complete({ prompt: 'fail', taskComplexity: 'low' }),
    ).rejects.toThrow('Ollama request failed: 500');
  });
});
