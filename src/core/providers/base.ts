import type { LlmRequest, LlmResponse } from '../llm-router.js';

export interface LlmProvider {
  complete(request: LlmRequest): Promise<LlmResponse>;
  readonly name: string;
}
