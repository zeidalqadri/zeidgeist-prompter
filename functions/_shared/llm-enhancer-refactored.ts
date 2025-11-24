/**
 * LLM Enhancer - Refactored Version Wrapper
 *
 * This wraps the refactored LLM system from /app/lib/llm/ for use in Cloudflare Functions
 * Provides backward compatibility with the legacy enhancer interface
 *
 * IMPORTANT: We must set environment source BEFORE importing LLMProviderFactory
 * to ensure providers are initialized with the correct environment
 */

import { setEnvironmentSource } from '../../app/lib/llm/llm-config';
import { EnhancementRequest, EnhancementResponse } from '../../app/lib/llm/types';

export interface ProviderPreferences {
  selectionMode?: 'random' | 'forced' | 'custom';
  forcedProvider?: string;
  excludedProviders: string[];
}

/**
 * Enhanced prompt with provider preferences and test mode support
 */
export async function enhancePrompt(
  prompt: string,
  context?: string,
  options: {
    isRefinement?: boolean;
    isExpansion?: boolean;
    repeatCount?: number;
    env?: Record<string, string>;
    providerPreferences?: ProviderPreferences | null;
    testProvider?: string | null;
  } = {}
): Promise<EnhancementResponse> {
  const {
    isRefinement = false,
    env = {},
    providerPreferences,
    testProvider
  } = options;

  // Set environment source for Cloudflare Workers FIRST
  if (env && Object.keys(env).length > 0) {
    setEnvironmentSource(env);
    console.log('🔧 Environment source set for Cloudflare Workers');
    console.log('🔍 Checking API keys...');
    console.log('DeepSeek key:', !!env.DEEPSEEK_API_KEY);
    console.log('Mistral key:', !!env.MISTRAL_API_KEY);
    console.log('Gemini key:', !!env.GEMINI_API_KEY);
  }

  // Dynamically import LLMProviderFactory AFTER setting environment
  // This ensures providers are initialized with the correct environment
  const { LLMProviderFactory } = await import('../../app/lib/llm/llm-provider.service');

  // Clear any cached providers to force re-initialization with new environment
  LLMProviderFactory.clearProviders();

  // Verify which providers are enabled after environment setup
  const { getEnabledProviders } = await import('../../app/lib/llm/llm-config');
  const enabledProviders = getEnabledProviders();
  console.log('✅ Enabled providers:', enabledProviders);

  // Build the enhancement request
  const request: EnhancementRequest = {
    prompt,
    context: context || '',
    isRefinement
  };

  try {
    // Use the refactored LLM system with fallback chain
    const response = await LLMProviderFactory.enhanceWithFallback(request);

    console.log('🎉 Enhancement successful:', response.source);

    return response;
  } catch (error) {
    console.error('❌ All providers failed:', error);

    // Fallback to local enhancement
    return {
      enhancedPrompt: prompt + '. (All LLM providers failed - using local enhancement)',
      source: 'local',
      metadata: {
        processingTime: 0
      }
    } as EnhancementResponse;
  }
}
