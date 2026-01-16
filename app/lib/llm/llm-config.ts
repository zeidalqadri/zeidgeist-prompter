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

  // Debug: Log what API keys we can detect
  const apiKeyNames = [
    'CLAUDE_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY',
    'MISTRAL_API_KEY', 'MOONSHOT_API_KEY', 'GEMINI_API_KEY'
  ];
  const detectedKeys = apiKeyNames.filter(key => !!env[key]);
  console.log(`[LLM Config] setEnvironmentSource called. Detected API keys: ${detectedKeys.length > 0 ? detectedKeys.join(', ') : 'NONE'}`);
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
 * Claude model tiers for intelligent selection
 */
export const claudeModels = {
  small: 'claude-3-haiku-20240307',      // Fast, cost-effective
  medium: 'claude-3-5-sonnet-20241022',  // Balanced
  large: 'claude-3-5-sonnet-20241022'    // Best quality (or claude-opus if available)
} as const;

/**
 * Get Claude configuration
 */
export function getClaudeConfig(): ProviderConfig {
  return {
    apiKey: getEnv('CLAUDE_API_KEY'),
    endpoint: getEnv('CLAUDE_ENDPOINT', 'https://api.anthropic.com/v1/messages'),
    model: getEnv('CLAUDE_MODEL', claudeModels.small),
    enabled: hasEnv('CLAUDE_API_KEY'),
    timeout: parseInt(getEnv('CLAUDE_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('CLAUDE_MAX_RETRIES', '2'), 10)
  };
}

/**
 * OpenAI model tiers for intelligent selection
 */
export const openaiModels = {
  small: 'gpt-4o-mini',    // Fast, cost-effective
  medium: 'gpt-4o',        // Balanced
  large: 'gpt-4o'          // Best available (gpt-4-turbo if preferred)
} as const;

/**
 * Get OpenAI configuration
 */
export function getOpenAIConfig(): ProviderConfig {
  return {
    apiKey: getEnv('OPENAI_API_KEY'),
    endpoint: getEnv('OPENAI_ENDPOINT', 'https://api.openai.com/v1/chat/completions'),
    model: getEnv('OPENAI_MODEL', openaiModels.small),
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
 * Mistral model tiers for intelligent selection (from legacy system)
 */
export const mistralModels = {
  small: 'mistral-small-latest',    // Fast, cost-effective
  medium: 'mistral-medium-latest',  // Balanced
  large: 'mistral-large-latest'     // Best quality
} as const;

/**
 * Get Mistral configuration
 */
export function getMistralConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MISTRAL_API_KEY'),
    endpoint: getEnv('MISTRAL_ENDPOINT', 'https://api.mistral.ai/v1/chat/completions'),
    model: getEnv('MISTRAL_MODEL', mistralModels.small),
    enabled: hasEnv('MISTRAL_API_KEY'),
    timeout: parseInt(getEnv('MISTRAL_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('MISTRAL_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Moonshot model tiers for intelligent selection
 */
export const moonshotModels = {
  small: 'moonshot-v1-8k',     // Fast, cost-effective (8k context)
  medium: 'moonshot-v1-32k',   // Balanced (32k context)
  large: 'moonshot-v1-128k'    // Best quality (128k context)
} as const;

/**
 * Get Moonshot configuration
 */
export function getMoonshotConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MOONSHOT_API_KEY'),
    endpoint: getEnv('MOONSHOT_ENDPOINT', 'https://api.moonshot.cn/v1/chat/completions'),
    model: getEnv('MOONSHOT_MODEL', moonshotModels.small),
    enabled: hasEnv('MOONSHOT_API_KEY'),
    timeout: parseInt(getEnv('MOONSHOT_TIMEOUT', '10000'), 10),
    maxRetries: parseInt(getEnv('MOONSHOT_MAX_RETRIES', '2'), 10)
  };
}

/**
 * Gemini model tiers for intelligent selection
 */
export const geminiModels = {
  small: 'gemini-1.5-flash',  // Fast, cost-effective
  medium: 'gemini-1.5-pro',   // Balanced
  large: 'gemini-1.5-pro'     // Best available (same as medium currently)
} as const;

/**
 * Get Gemini configuration
 */
export function getGeminiConfig(): ProviderConfig {
  return {
    apiKey: getEnv('GEMINI_API_KEY'),
    endpoint: getEnv('GEMINI_ENDPOINT', 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent'),
    model: getEnv('GEMINI_MODEL', geminiModels.small),
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

/**
 * Log provider diagnostics for debugging
 * Shows which providers are configured, their endpoints, and models
 */
export function logProviderDiagnostics(): void {
  const providers = [
    { name: 'Claude', getConfig: getClaudeConfig, keyName: 'CLAUDE_API_KEY' },
    { name: 'OpenAI', getConfig: getOpenAIConfig, keyName: 'OPENAI_API_KEY' },
    { name: 'DeepSeek', getConfig: getDeepseekConfig, keyName: 'DEEPSEEK_API_KEY' },
    { name: 'Mistral', getConfig: getMistralConfig, keyName: 'MISTRAL_API_KEY' },
    { name: 'Moonshot', getConfig: getMoonshotConfig, keyName: 'MOONSHOT_API_KEY' },
    { name: 'Gemini', getConfig: getGeminiConfig, keyName: 'GEMINI_API_KEY' }
  ];

  console.log('=== LLM Provider Diagnostics ===');

  for (const provider of providers) {
    const config = provider.getConfig();
    const keyPrefix = config.apiKey ? config.apiKey.substring(0, 8) + '...' : 'NOT SET';

    console.log(`[${provider.name}]`);
    console.log(`  Enabled: ${config.enabled}`);
    console.log(`  API Key: ${keyPrefix}`);
    console.log(`  Endpoint: ${config.endpoint}`);
    console.log(`  Model: ${config.model}`);
    console.log(`  Timeout: ${config.timeout || 10000}ms`);
  }

  console.log('================================');
  console.log(`Provider Priority: ${providerPriority.join(' → ')}`);
  console.log('================================');
}

// Validate configuration on module load (only for Node.js)
if (typeof process !== 'undefined') {
  validateEnvironment();
}
