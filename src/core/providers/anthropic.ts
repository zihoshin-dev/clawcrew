import Anthropic from '@anthropic-ai/sdk';
import type { LlmRequest, LlmResponse } from '../llm-router.js';
import type { LlmProvider } from './base.js';

const PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'claude-haiku-4-5': { inputPer1k: 0.00025, outputPer1k: 0.00125 },
  'claude-sonnet-4-5': { inputPer1k: 0.003, outputPer1k: 0.015 },
  'claude-opus-4': { inputPer1k: 0.015, outputPer1k: 0.075 },
};

export class AnthropicProvider implements LlmProvider {
  readonly name = 'anthropic';
  private readonly client: Anthropic;

  constructor(apiKey?: string) {
    this.client = new Anthropic({ apiKey: apiKey ?? process.env['ANTHROPIC_API_KEY'] });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = request.model ?? 'claude-sonnet-4-5';

    const message = await this.client.messages.create({
      model,
      max_tokens: 4096,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const inputTokens = message.usage.input_tokens;
    const outputTokens = message.usage.output_tokens;
    const totalTokens = inputTokens + outputTokens;

    const price = PRICING[model] ?? { inputPer1k: 0.003, outputPer1k: 0.015 };
    const cost =
      (inputTokens / 1000) * price.inputPer1k +
      (outputTokens / 1000) * price.outputPer1k;

    const firstContent = message.content[0];
    const content = firstContent !== undefined && firstContent.type === 'text'
      ? firstContent.text
      : '';

    return {
      content,
      model,
      provider: this.name,
      tokensUsed: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost,
    };
  }
}
