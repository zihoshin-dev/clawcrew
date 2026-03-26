import type { AgentRole, LlmConfig } from './types.js';
import type { LlmProvider } from './providers/base.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { OpenAIProvider } from './providers/openai.js';
import { GeminiProvider } from './providers/gemini.js';
import { OllamaProvider } from './providers/ollama.js';
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

export interface LLMRouterOptions {
  routing?: RoutingConfig;
  cache?: LlmCache;
  defaultConfig?: Partial<LlmConfig>;
  agentOverrides?: Partial<Record<AgentRole, Partial<LlmConfig>>>;
}

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
  private readonly defaultConfig: Partial<LlmConfig> | undefined;
  private readonly agentOverrides: Partial<Record<AgentRole, Partial<LlmConfig>>>;

  constructor(options?: LLMRouterOptions) {
    this.routing = options?.routing ?? DEFAULT_ROUTING;
    this.cache = options?.cache;
    this.defaultConfig = options?.defaultConfig;
    this.agentOverrides = options?.agentOverrides ?? {};
  }

  private getProvider(name: string, apiKey?: string): LlmProvider {
    const cacheKey = `${name}:${apiKey ?? ''}`;
    let provider = this.providerCache.get(cacheKey);
    if (provider !== undefined) return provider;

    switch (name) {
      case 'anthropic':
        provider = new AnthropicProvider(apiKey);
        break;
      case 'openai':
        provider = new OpenAIProvider(apiKey);
        break;
      case 'google':
        provider = new GeminiProvider(apiKey);
        break;
      case 'ollama':
        provider = new OllamaProvider();
        break;
      default:
        throw new Error(`Unknown provider: ${name}`);
    }
    this.providerCache.set(cacheKey, provider);
    return provider;
  }

  get providers(): Map<string, LlmProvider> {
    return this.providerCache;
  }

  hasConfiguredProvider(agentRole?: AgentRole): boolean {
    const effectiveConfig = this.resolveEffectiveConfig(agentRole);
    if (effectiveConfig.apiKey !== undefined && effectiveConfig.apiKey.length > 0) {
      return true;
    }

    if (effectiveConfig.provider !== undefined) {
      return envApiKeyForProvider(effectiveConfig.provider) !== undefined;
    }

    return ['anthropic', 'openai', 'google', 'ollama'].some((provider) => envApiKeyForProvider(provider) !== undefined);
  }

  async route(request: LlmRequest): Promise<LlmResponse> {
    if (request.taskComplexity === 'critical') {
      return this.multiModelConsensus(request);
    }

    const config = this.routing[request.taskComplexity] as ComplexityConfig;
    const effectiveConfig = this.resolveEffectiveConfig(request.agentRole);
    const primary = resolvePrimaryProvider(config.primary, effectiveConfig, request.model);
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

    const provider = this.getProvider(primary.provider, effectiveConfig?.apiKey);
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

  private resolveEffectiveConfig(agentRole?: AgentRole): Partial<LlmConfig> {
    return {
      ...(this.defaultConfig ?? {}),
      ...(agentRole !== undefined ? this.agentOverrides[agentRole] ?? {} : {}),
    };
  }
}

function resolvePrimaryProvider(
  primary: ProviderModelPair,
  effectiveConfig?: Partial<LlmConfig>,
  explicitModel?: string,
): ProviderModelPair {
  if (effectiveConfig?.provider !== undefined || effectiveConfig?.model !== undefined) {
    return {
      provider: effectiveConfig.provider ?? primary.provider,
      model: explicitModel ?? effectiveConfig.model ?? primary.model,
    };
  }

  const provider = process.env['LLM_PROVIDER'];
  const model = process.env['LLM_MODEL'];
  if (provider === undefined) {
    return primary;
  }

  return {
    provider,
    model: model ?? primary.model,
  };
}

function envApiKeyForProvider(provider: string): string | undefined {
  switch (provider) {
    case 'anthropic':
      return normalizeEnv(process.env['ANTHROPIC_API_KEY']);
    case 'openai':
      return normalizeEnv(process.env['OPENAI_API_KEY']);
    case 'google':
      return normalizeEnv(process.env['GOOGLE_API_KEY']);
    case 'ollama':
      return 'ollama';
    default:
      return undefined;
  }
}

function normalizeEnv(value: string | undefined): string | undefined {
  if (value === undefined || value.length === 0 || value === 'undefined') {
    return undefined;
  }
  return value;
}
