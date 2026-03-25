import type { LlmRequest, LlmResponse } from '../llm-router.js';
import type { LlmProvider } from './base.js';

interface OllamaGenerateResponse {
  model: string;
  response: string;
  prompt_eval_count?: number;
  eval_count?: number;
}

export class OllamaProvider implements LlmProvider {
  readonly name = 'ollama';
  private readonly baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? 'http://localhost:11434';
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = request.model ?? 'llama3';

    const res = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt: request.prompt,
        system: request.systemPrompt ?? '',
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`Ollama request failed: ${res.status} ${res.statusText}`);
    }

    const data = (await res.json()) as OllamaGenerateResponse;

    const inputTokens = data.prompt_eval_count ?? 0;
    const outputTokens = data.eval_count ?? 0;
    const totalTokens = inputTokens + outputTokens;

    return {
      content: data.response,
      model: data.model,
      provider: this.name,
      tokensUsed: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost: 0, // Local model — no cost
    };
  }
}
