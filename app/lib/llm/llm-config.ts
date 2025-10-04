/**
 * LLM Provider Configuration
 *
 * Centralized configuration for all LLM providers with validation
 */

import { ProviderConfig, ProviderSource } from './types';

// Environment validation
function validateEnvironment(): void {
  const hasDeepSeek = !!process.env.DEEPSEEK_API_KEY;
  const hasMistral = !!process.env.MISTRAL_API_KEY;
  const hasGemini = !!process.env.GEMINI_API_KEY;

  if (!hasDeepSeek && !hasMistral && !hasGemini) {
    console.warn('[LLM Config] No external LLM providers configured. Will use local fallback only.');
  } else {
    const providers = [
      hasDeepSeek && 'DeepSeek',
      hasMistral && 'Mistral',
      hasGemini && 'Gemini'
    ].filter(Boolean);
    console.log(`[LLM Config] Configured providers: ${providers.join(', ')}`);
  }
}

// DeepSeek configuration
export const deepseekConfig: ProviderConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  endpoint: process.env.DEEPSEEK_ENDPOINT || 'https://api.deepseek.com/v1/chat/completions',
  model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
  enabled: !!process.env.DEEPSEEK_API_KEY,
  timeout: parseInt(process.env.DEEPSEEK_TIMEOUT || '10000', 10),
  maxRetries: parseInt(process.env.DEEPSEEK_MAX_RETRIES || '2', 10)
};

// Mistral configuration
export const mistralConfig: ProviderConfig = {
  apiKey: process.env.MISTRAL_API_KEY || '',
  endpoint: process.env.MISTRAL_ENDPOINT || 'https://api.mistral.ai/v1/chat/completions',
  model: process.env.MISTRAL_MODEL || 'mistral-large-latest',
  enabled: !!process.env.MISTRAL_API_KEY,
  timeout: parseInt(process.env.MISTRAL_TIMEOUT || '10000', 10),
  maxRetries: parseInt(process.env.MISTRAL_MAX_RETRIES || '2', 10)
};

// Gemini configuration
export const geminiConfig: ProviderConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  endpoint: process.env.GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  model: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
  enabled: !!process.env.GEMINI_API_KEY,
  timeout: parseInt(process.env.GEMINI_TIMEOUT || '10000', 10),
  maxRetries: parseInt(process.env.GEMINI_MAX_RETRIES || '2', 10)
};

// Provider priority order
export const providerPriority: ProviderSource[] = [
  'deepseek',
  'mistral',
  'gemini',
  'local'
];

// Get configuration for a specific provider
export function getProviderConfig(provider: ProviderSource): ProviderConfig | null {
  switch (provider) {
    case 'deepseek':
      return deepseekConfig;
    case 'mistral':
      return mistralConfig;
    case 'gemini':
      return geminiConfig;
    default:
      return null;
  }
}

// Check if any external provider is configured
export function hasExternalProvider(): boolean {
  return deepseekConfig.enabled || mistralConfig.enabled || geminiConfig.enabled;
}

// Get list of enabled providers
export function getEnabledProviders(): ProviderSource[] {
  const enabled: ProviderSource[] = [];

  if (deepseekConfig.enabled) enabled.push('deepseek');
  if (mistralConfig.enabled) enabled.push('mistral');
  if (geminiConfig.enabled) enabled.push('gemini');

  // Always include local as fallback
  enabled.push('local');

  return enabled;
}

// Validate configuration on module load
validateEnvironment();
