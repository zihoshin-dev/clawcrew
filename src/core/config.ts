import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { z } from 'zod';
import type { AigoraConfig } from './types.js';

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const MessengerConfigSchema = z.object({
  type: z.enum(['slack', 'telegram']),
  token: z.string().default(''),
  signingSecret: z.string().optional(),
  botToken: z.string().optional(),
  appToken: z.string().optional(),
});

const LlmConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']).default('anthropic'),
  model: z.string().default('claude-sonnet-4-5'),
  apiKey: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().optional(),
});

export const AigoraConfigSchema = z.object({
  messengers: z.array(MessengerConfigSchema).default([]),
  llm: LlmConfigSchema.default({}),
  agentLlmOverrides: z.record(z.string(), LlmConfigSchema).optional(),
  maxAgentsPerProject: z.number().positive().optional(),
  decisionTimeoutMs: z.number().positive().optional(),
  deadlockTimeoutMs: z.number().positive().optional(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).optional(),
});

// ---------------------------------------------------------------------------
// loadConfig
// ---------------------------------------------------------------------------

function readYamlFile(filePath: string): Record<string, unknown> {
  const raw = readFileSync(filePath, 'utf-8');
  return (parseYaml(raw) as Record<string, unknown>) ?? {};
}

function fromEnv(): Partial<AigoraConfig> {
  const partial: Record<string, unknown> = {};

  if (process.env['LOG_LEVEL'] !== undefined) {
    partial['logLevel'] = process.env['LOG_LEVEL'];
  }

  const llmPartial: Record<string, unknown> = {};
  if (process.env['LLM_PROVIDER'] !== undefined) {
    llmPartial['provider'] = process.env['LLM_PROVIDER'];
  }
  if (process.env['LLM_MODEL'] !== undefined) {
    llmPartial['model'] = process.env['LLM_MODEL'];
  }
  if (process.env['ANTHROPIC_API_KEY'] !== undefined) {
    llmPartial['apiKey'] = process.env['ANTHROPIC_API_KEY'];
  }
  if (Object.keys(llmPartial).length > 0) {
    partial['llm'] = llmPartial;
  }

  return partial as Partial<AigoraConfig>;
}

export function loadConfig(configPath?: string): AigoraConfig {
  // Start with built-in defaults from default.yaml
  const defaultYamlPath = resolve(process.cwd(), 'config', 'default.yaml');
  let base: Record<string, unknown> = {};
  if (existsSync(defaultYamlPath)) {
    base = readYamlFile(defaultYamlPath);
  }

  // Layer user-specified config file
  if (configPath !== undefined && existsSync(configPath)) {
    const userConfig = readYamlFile(configPath);
    base = deepMerge(base, userConfig);
  }

  // Layer env vars
  const envOverrides = fromEnv();
  const merged = deepMerge(base, envOverrides as Record<string, unknown>);

  const parsed = AigoraConfigSchema.parse(merged);
  return parsed as AigoraConfig;
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      typeof target[key] === 'object' &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(
        target[key] as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      result[key] = value;
    }
  }
  return result;
}
