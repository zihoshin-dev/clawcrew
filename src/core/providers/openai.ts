import OpenAI from 'openai';
import type { LlmRequest, LlmResponse } from '../llm-router.js';
import type { LlmProvider } from './base.js';

const PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'gpt-4o-mini': { inputPer1k: 0.00015, outputPer1k: 0.0006 },
  'gpt-4o': { inputPer1k: 0.0025, outputPer1k: 0.01 },
  'o1': { inputPer1k: 0.015, outputPer1k: 0.06 },
};

export class OpenAIProvider implements LlmProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;

  constructor(apiKey?: string) {
    this.client = new OpenAI({ apiKey: apiKey ?? process.env['OPENAI_API_KEY'] });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = request.model ?? 'gpt-4o-mini';

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (request.systemPrompt !== undefined) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }
    messages.push({ role: 'user', content: request.prompt });

    const completion = await this.client.chat.completions.create({
      model,
      messages,
    });

    const usage = completion.usage;
    const inputTokens = usage?.prompt_tokens ?? 0;
    const outputTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;

    const price = PRICING[model] ?? { inputPer1k: 0.0025, outputPer1k: 0.01 };
    const cost =
      (inputTokens / 1000) * price.inputPer1k +
      (outputTokens / 1000) * price.outputPer1k;

    const content = completion.choices[0]?.message.content ?? '';

    return {
      content,
      model,
      provider: this.name,
      tokensUsed: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost,
    };
  }
}
