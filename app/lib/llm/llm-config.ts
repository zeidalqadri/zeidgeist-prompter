/**
 * LLM Provider Configuration
 *
 * Centralized configuration for all LLM providers with validation
 * Supports both Node.js (process.env) and Cloudflare Workers (env object)
 */

import { ProviderConfig, ProviderSource } from './types';

// Environment source - can be process.env or Cloudflare env
let environmentSource: Record<string, string | undefined> =
  typeof process !== 'undefined' ? process.env : {};

/**
 * Set the environment source (for Cloudflare Workers)
 */
export function setEnvironmentSource(env: Record<string, string | undefined>): void {
  environmentSource = env;
}

/**
 * Get environment variable from current source
 */
function getEnv(key: string, defaultValue = ''): string {
  return environmentSource[key] || defaultValue;
}

/**
 * Check if environment variable exists
 */
function hasEnv(key: string): boolean {
  return !!environmentSource[key];
}

// Environment validation
function validateEnvironment(env?: Record<string, string | undefined>): void {
  const source = env || environmentSource;
  const hasClaude = !!source.CLAUDE_API_KEY;
  const hasOpenAI = !!source.OPENAI_API_KEY;
  const hasDeepSeek = !!source.DEEPSEEK_API_KEY;
  const hasMistral = !!source.MISTRAL_API_KEY;
  const hasMoonshot = !!source.MOONSHOT_API_KEY;
  const hasGemini = !!source.GEMINI_API_KEY;

  if (!hasClaude && !hasOpenAI && !hasDeepSeek && !hasMistral && !hasMoonshot && !hasGemini) {
    console.warn('[LLM Config] No external LLM providers configured. Will use local fallback only.');
  } else {
    const providers = [
      hasClaude && 'Claude',
      hasOpenAI && 'OpenAI',
      hasDeepSeek && 'DeepSeek',
      hasMistral && 'Mistral',
      hasMoonshot && 'Moonshot',
      hasGemini && 'Gemini'
    ].filter(Boolean);
    console.log(`[LLM Config] Configured providers: ${providers.join(', ')}`);
  }
}

/**
 * Get Claude configuration
 */
export function getClaudeConfig(): ProviderConfig {
  return {
    apiKey: getEnv('CLAUDE_API_KEY'),
    endpoint: getEnv('CLAUDE_ENDPOINT', 'https://api.anthropic.com/v1/messages'),
    model: getEnv('CLAUDE_MODEL', 'claude-3-haiku-20240307'),
    enabled: hasEnv('CLAUDE_API_KEY'),
    timeout: parseInt(getEnv('CLAUDE_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('CLAUDE_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Get OpenAI configuration
 */
export function getOpenAIConfig(): ProviderConfig {
  return {
    apiKey: getEnv('OPENAI_API_KEY'),
    endpoint: getEnv('OPENAI_ENDPOINT', 'https://api.openai.com/v1/chat/completions'),
    model: getEnv('OPENAI_MODEL', 'gpt-4o-mini'),
    enabled: hasEnv('OPENAI_API_KEY'),
    timeout: parseInt(getEnv('OPENAI_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('OPENAI_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Get DeepSeek configuration
 */
export function getDeepseekConfig(): ProviderConfig {
  return {
    apiKey: getEnv('DEEPSEEK_API_KEY'),
    endpoint: getEnv('DEEPSEEK_ENDPOINT', 'https://api.deepseek.com/v1/chat/completions'),
    model: getEnv('DEEPSEEK_MODEL', 'deepseek-chat'),
    enabled: hasEnv('DEEPSEEK_API_KEY'),
    timeout: parseInt(getEnv('DEEPSEEK_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('DEEPSEEK_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Get Mistral configuration
 */
export function getMistralConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MISTRAL_API_KEY'),
    endpoint: getEnv('MISTRAL_ENDPOINT', 'https://api.mistral.ai/v1/chat/completions'),
    model: getEnv('MISTRAL_MODEL', 'mistral-large-latest'),
    enabled: hasEnv('MISTRAL_API_KEY'),
    timeout: parseInt(getEnv('MISTRAL_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('MISTRAL_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Get Moonshot configuration
 */
export function getMoonshotConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MOONSHOT_API_KEY'),
    endpoint: getEnv('MOONSHOT_ENDPOINT', 'https://api.moonshot.cn/v1/chat/completions'),
    model: getEnv('MOONSHOT_MODEL', 'moonshot-v1-8k'),
    enabled: hasEnv('MOONSHOT_API_KEY'),
    timeout: parseInt(getEnv('MOONSHOT_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('MOONSHOT_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Get Gemini configuration
 */
export function getGeminiConfig(): ProviderConfig {
  return {
    apiKey: getEnv('GEMINI_API_KEY'),
    endpoint: getEnv('GEMINI_ENDPOINT', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'),
    model: getEnv('GEMINI_MODEL', 'gemini-1.5-pro'),
    enabled: hasEnv('GEMINI_API_KEY'),
    timeout: parseInt(getEnv('GEMINI_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('GEMINI_MAX_RETRIES', '2'), 10)
  };
}

// Provider priority order (optimized based on speed and reliability)
export const providerPriority: ProviderSource[] = [
  'claude',
  'openai',
  'deepseek',
  'mistral',
  'moonshot',
  'gemini',
  'local'
];

/**
 * Get configuration for a specific provider
 */
export function getProviderConfig(provider: ProviderSource): ProviderConfig | null {
  switch (provider) {
    case 'claude':
      return getClaudeConfig();
    case 'openai':
      return getOpenAIConfig();
    case 'deepseek':
      return getDeepseekConfig();
    case 'mistral':
      return getMistralConfig();
    case 'moonshot':
      return getMoonshotConfig();
    case 'gemini':
      return getGeminiConfig();
    default:
      return null;
  }
}

/**
 * Check if any external provider is configured
 */
export function hasExternalProvider(): boolean {
  return hasEnv('CLAUDE_API_KEY') ||
         hasEnv('OPENAI_API_KEY') ||
         hasEnv('DEEPSEEK_API_KEY') ||
         hasEnv('MISTRAL_API_KEY') ||
         hasEnv('MOONSHOT_API_KEY') ||
         hasEnv('GEMINI_API_KEY');
}

/**
 * Get list of enabled providers
 */
export function getEnabledProviders(): ProviderSource[] {
  const enabled: ProviderSource[] = [];

  if (hasEnv('CLAUDE_API_KEY')) enabled.push('claude');
  if (hasEnv('OPENAI_API_KEY')) enabled.push('openai');
  if (hasEnv('DEEPSEEK_API_KEY')) enabled.push('deepseek');
  if (hasEnv('MISTRAL_API_KEY')) enabled.push('mistral');
  if (hasEnv('MOONSHOT_API_KEY')) enabled.push('moonshot');
  if (hasEnv('GEMINI_API_KEY')) enabled.push('gemini');

  // Always include local as fallback
  enabled.push('local');

  return enabled;
}

// Validate configuration on module load (only for Node.js)
if (typeof process !== 'undefined') {
  validateEnvironment();
}
