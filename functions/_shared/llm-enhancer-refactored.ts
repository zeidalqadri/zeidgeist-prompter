/**
 * LLM Enhancer - Refactored Version Wrapper
 *
 * This wraps the refactored LLM system from /app/lib/llm/ for use in Cloudflare Functions
 * Provides backward compatibility with the legacy enhancer interface
 *
 * IMPORTANT: ALL imports must be dynamic to ensure proper environment initialization
 * No static imports allowed to avoid module loading before environment is available
 */

// Type imports are safe as they don't execute code
import type { EnhancementRequest, EnhancementResponse } from '../../app/lib/llm/types';

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

  // Debug: Log the actual env object structure
  console.log('🔍 Debugging env object:');
  console.log('env type:', typeof env);
  console.log('env is null:', env === null);
  console.log('env is undefined:', env === undefined);

  // Check different possible structures
  console.log('Direct keys (first 10):', env ? Object.keys(env).slice(0, 10) : 'N/A');
  console.log('Has DEEPSEEK_API_KEY directly:', !!env?.DEEPSEEK_API_KEY);
  console.log('Has MISTRAL_API_KEY directly:', !!env?.MISTRAL_API_KEY);
  console.log('Has GEMINI_API_KEY directly:', !!env?.GEMINI_API_KEY);

  // Check if keys might be in a nested structure
  if (env && typeof env === 'object') {
    console.log('Checking for nested structures...');
    console.log('env.vars exists:', !!env.vars);
    console.log('env.bindings exists:', !!env.bindings);
    console.log('env.secrets exists:', !!env.secrets);
  }

  // Dynamically import ALL modules to avoid static initialization
  const { setEnvironmentSource } = await import('../../app/lib/llm/llm-config');

  // Set environment source for Cloudflare Workers
  if (env && Object.keys(env).length > 0) {
    setEnvironmentSource(env);
    console.log('🔧 Environment source set for Cloudflare Workers');
    console.log('🔑 API keys after setting environment:');
    console.log('  DeepSeek:', !!env.DEEPSEEK_API_KEY ? '✅ Present' : '❌ Missing');
    console.log('  Mistral:', !!env.MISTRAL_API_KEY ? '✅ Present' : '❌ Missing');
    console.log('  Gemini:', !!env.GEMINI_API_KEY ? '✅ Present' : '❌ Missing');
  } else {
    console.log('⚠️ Warning: env object is empty or invalid');
  }

  // Import provider factory
  const { LLMProviderFactory } = await import('../../app/lib/llm/llm-provider.service');

  // Clear any cached providers to force re-initialization
  LLMProviderFactory.clearProviders();
  console.log('🔄 Provider cache cleared');

  // Import and check enabled providers
  const { getEnabledProviders, getDeepseekConfig, getMistralConfig, getGeminiConfig } = await import('../../app/lib/llm/llm-config');

  // Check each provider's config directly
  console.log('📊 Provider configurations:');
  const deepseekConfig = getDeepseekConfig();
  console.log('  DeepSeek enabled:', deepseekConfig.enabled, 'hasKey:', !!deepseekConfig.apiKey);

  const mistralConfig = getMistralConfig();
  console.log('  Mistral enabled:', mistralConfig.enabled, 'hasKey:', !!mistralConfig.apiKey);

  const geminiConfig = getGeminiConfig();
  console.log('  Gemini enabled:', geminiConfig.enabled, 'hasKey:', !!geminiConfig.apiKey);

  const enabledProviders = getEnabledProviders();
  console.log('✅ Final enabled providers list:', enabledProviders);

  // Build the enhancement request
  const request: EnhancementRequest = {
    prompt,
    context: context || '',
    isRefinement
  };

  try {
    console.log('🚀 Calling LLMProviderFactory.enhanceWithFallback...');
    const response = await LLMProviderFactory.enhanceWithFallback(request);

    console.log('🎉 Enhancement successful!');
    console.log('  Source:', response.source);
    console.log('  Enhanced length:', response.enhancedPrompt?.length || 0);

    return response;
  } catch (error) {
    console.error('❌ All providers failed with error:');
    console.error('  Error type:', error?.constructor?.name);
    console.error('  Error message:', error instanceof Error ? error.message : String(error));
    console.error('  Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    // Log the enabled providers that were tried
    console.log('📝 Providers that were attempted:', enabledProviders);

    // Create detailed error metadata
    const errorDetails = {
      errorType: error?.constructor?.name || 'Unknown',
      errorMessage: error instanceof Error ? error.message : String(error),
      attemptedProviders: enabledProviders,
      envKeysPresent: {
        deepseek: !!env?.DEEPSEEK_API_KEY,
        mistral: !!env?.MISTRAL_API_KEY,
        gemini: !!env?.GEMINI_API_KEY
      }
    };

    // Fallback to local enhancement with detailed error info
    return {
      enhancedPrompt: prompt + '. (All LLM providers failed - using local enhancement)',
      source: 'local',
      metadata: {
        processingTime: 0,
        fallbackReason: 'all_providers_failed',
        errorDetails: JSON.stringify(errorDetails)
      }
    } as EnhancementResponse;
  }
}
