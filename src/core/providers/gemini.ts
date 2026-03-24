import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LlmRequest, LlmResponse } from '../llm-router.js';
import type { LlmProvider } from './base.js';

const PRICING: Record<string, { inputPer1k: number; outputPer1k: number }> = {
  'gemini-2.0-flash': { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini-2.5-pro': { inputPer1k: 0.00125, outputPer1k: 0.01 },
};

export class GeminiProvider implements LlmProvider {
  readonly name = 'google';
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenerativeAI(apiKey ?? process.env['GOOGLE_API_KEY'] ?? '');
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const model = request.model ?? 'gemini-2.0-flash';

    const genModel = this.client.getGenerativeModel({
      model,
      systemInstruction: request.systemPrompt,
    });

    const result = await genModel.generateContent(request.prompt);
    const response = result.response;

    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;
    const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

    const price = PRICING[model] ?? { inputPer1k: 0.00125, outputPer1k: 0.01 };
    const cost =
      (inputTokens / 1000) * price.inputPer1k +
      (outputTokens / 1000) * price.outputPer1k;

    const content = response.text();

    return {
      content,
      model,
      provider: this.name,
      tokensUsed: { input: inputTokens, output: outputTokens, total: totalTokens },
      cost,
    };
  }
}
