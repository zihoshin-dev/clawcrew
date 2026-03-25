import type { AgentRole } from './types.js';
import type { LlmProvider } from './providers/base.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import type { LlmCache } from './llm-cache.js';

export type TaskComplexity = 'low' | 'medium' | 'high' | 'critical';

export interface LlmRequest {
  prompt: string;
  systemPrompt?: string;
  model?: string;
  agentRole?: AgentRole;
  taskComplexity: TaskComplexity;
}

export interface LlmResponse {
  content: string;
  model: string;
  provider: string;
  tokensUsed: { input: number; output: number; total: number };
  cost: number;
}

interface ProviderModelPair {
  provider: string;
  model: string;
}

interface ComplexityConfig {
  primary: ProviderModelPair;
  secondary: ProviderModelPair;
}

interface CriticalConfig {
  providers: ProviderModelPair[];
}

type RoutingConfig = {
  low: ComplexityConfig;
  medium: ComplexityConfig;
  high: ComplexityConfig;
  critical: CriticalConfig;
};

const DEFAULT_ROUTING: RoutingConfig = {
  low: {
    primary: { provider: 'anthropic', model: 'claude-haiku-4-5' },
    secondary: { provider: 'openai', model: 'gpt-4o-mini' },
  },
  medium: {
    primary: { provider: 'anthropic', model: 'claude-sonnet-4-5' },
    secondary: { provider: 'openai', model: 'gpt-4o-mini' },
  },
  high: {
    primary: { provider: 'anthropic', model: 'claude-opus-4' },
    secondary: { provider: 'openai', model: 'gpt-4o' },
  },
  critical: {
    providers: [
      { provider: 'anthropic', model: 'claude-opus-4' },
      { provider: 'openai', model: 'gpt-4o' },
      { provider: 'google', model: 'gemini-2.5-pro' },
    ],
  },
};

// ---------------------------------------------------------------------------
// LLMRouter
// ---------------------------------------------------------------------------

export class LLMRouter {
  private readonly providerCache = new Map<string, LlmProvider>();
  private readonly routing: RoutingConfig;
  private readonly cache: LlmCache | undefined;

  constructor(routing?: RoutingConfig, cache?: LlmCache) {
    this.routing = routing ?? DEFAULT_ROUTING;
    this.cache = cache;
  }

  private getProvider(name: string): LlmProvider {
    let provider = this.providerCache.get(name);
    if (provider !== undefined) return provider;

    switch (name) {
      case 'anthropic':
        provider = new AnthropicProvider();
        break;
      case 'openai':
        provider = new OpenAIProvider();
        break;
      case 'google':
        provider = new GeminiProvider();
        break;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
    this.providerCache.set(name, provider);
    return provider;
  }

  get providers(): Map<string, LlmProvider> {
    return this.providerCache;
  }

  async route(request: LlmRequest): Promise<LlmResponse> {
    if (request.taskComplexity === 'critical') {
      return this.multiModelConsensus(request);
    }

    const config = this.routing[request.taskComplexity] as ComplexityConfig;
    const primary = config.primary;
    const secondary = config.secondary;

    // Use explicit model override if provided
    const resolvedModel = request.model ?? primary.model;
    const primaryRequest = { ...request, model: resolvedModel };

    // Check cache before calling LLM
    if (this.cache !== undefined) {
      const cached = this.cache.get(
        request.prompt,
        request.systemPrompt ?? '',
        resolvedModel,
      );
      if (cached !== undefined) return cached;
    }

    const provider = this.getProvider(primary.provider);
    if (provider === undefined) {
      throw new Error(`Provider not found: ${primary.provider}`);
    }

    try {
      const response = await provider.complete(primaryRequest);
      this.cache?.set(request.prompt, request.systemPrompt ?? '', resolvedModel, response);
      return response;
    } catch (primaryError) {
      // Fallback to secondary provider
      const fallbackProvider = this.getProvider(secondary.provider);
      if (fallbackProvider === undefined) {
        throw primaryError;
      }
      const fallbackRequest = { ...request, model: secondary.model };
      const response = await fallbackProvider.complete(fallbackRequest);
      this.cache?.set(request.prompt, request.systemPrompt ?? '', secondary.model, response);
      return response;
    }
  }

  private async multiModelConsensus(request: LlmRequest): Promise<LlmResponse> {
    const criticalConfig = this.routing.critical;
    const responses: LlmResponse[] = [];

    for (const pair of criticalConfig.providers) {
      const provider = this.getProvider(pair.provider);
      if (provider === undefined) continue;
      try {
        const resp = await provider.complete({ ...request, model: pair.model });
        responses.push(resp);
      } catch {
        // skip failed providers in consensus
      }
    }

    if (responses.length === 0) {
      throw new Error('All providers failed for critical consensus request.');
    }

    // Use the first successful response as the canonical answer,
    // but aggregate token usage and cost across all providers.
    const primary = responses[0]!;
    const totalTokens = responses.reduce((acc, r) => ({
      input: acc.input + r.tokensUsed.input,
      output: acc.output + r.tokensUsed.output,
      total: acc.total + r.tokensUsed.total,
    }), { input: 0, output: 0, total: 0 });
    const totalCost = responses.reduce((acc, r) => acc + r.cost, 0);

    return {
      content: primary.content,
      model: responses.map((r) => r.model).join('+'),
      provider: 'multi-model',
      tokensUsed: totalTokens,
      cost: totalCost,
    };
  }
}
