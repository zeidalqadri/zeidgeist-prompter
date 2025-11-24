/**
 * LLM Provider Service
 *
 * Abstraction layer for multiple LLM providers with fallback chain
 * Now includes circuit breakers and retry policies for resilience
 */

import { trainingExamples } from '../training-data';
import {
  ILLMProvider,
  EnhancementRequest,
  EnhancementResponse,
  ChatMessage,
  ProviderSource,
  ProviderConfig
} from './types';
import {
  getDeepseekConfig,
  getMistralConfig,
  getGeminiConfig,
  providerPriority
} from './llm-config';
import { CircuitBreakerFactory } from '../resilience/circuit-breaker';
import { RetryPolicy } from '../resilience/retry-policy';
import type { EnhancedCircuitBreaker } from '../resilience/circuit-breaker';

// ============================================================================
// BASE PROVIDER CLASS
// ============================================================================

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: ProviderSource;
  protected abstract config: ProviderConfig;
  protected circuitBreaker?: EnhancedCircuitBreaker<EnhancementRequest, EnhancementResponse>;
  protected retryPolicy: RetryPolicy;

  constructor() {
    // Initialize retry policy with exponential backoff
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3,
      initialDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']
    });
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Initialize circuit breaker for provider
   */
  protected initializeCircuitBreaker(): void {
    if (!this.circuitBreaker) {
      this.circuitBreaker = CircuitBreakerFactory.getBreaker(
        this.name,
        (request: EnhancementRequest) => this.enhanceInternal(request),
        {
          timeout: this.config.timeout || 10000,
          errorThresholdPercentage: 50,
          resetTimeout: 30000,
          rollingCountTimeout: 10000,
          rollingCountBuckets: 10,
          name: this.name,
          enabled: true
        }
      );
    }
  }

  /**
   * Build messages for prompt enhancement
   */
  buildMessages(request: EnhancementRequest): ChatMessage[] {
    const { prompt, context, isRefinement = false } = request;

    // System prompt with CoT reasoning
    const baseSystemPrompt = `You are an expert prompt engineer that enhances prompts to make them clearer and more effective.

CHAIN-OF-THOUGHT PROCESS:
Think through your enhancement step-by-step:

1. ANALYSIS: First, analyze the prompt's current state
   - What is the core intent and domain?
   - What specific information is missing?
   - What ambiguities exist?
   - How clear are the success criteria?

2. PLANNING: Plan your enhancements
   - What specific details should be added?
   - What structure would improve clarity?
   - What domain-specific requirements apply?
   - How can you make it more actionable?

3. ENHANCEMENT: Apply systematic improvements
   - Add missing context and specifications
   - Improve organization and flow
   - Include success criteria and constraints
   - Ensure completeness without redundancy

Follow these guidelines:
1. Identify the core purpose and domain of the prompt
2. Add specific details and clarity without changing the original intent
3. Remove redundancies and improve organization
4. Add relevant specifications for structure or format if appropriate
5. Include measurable success criteria where appropriate
6. Consider edge cases and potential misunderstandings
7. DO NOT add "You are..." or role descriptions unless specifically needed
8. The output should be ONLY the enhanced prompt text, nothing else
9. NEVER include phrases like "Here's the refined prompt:" or explanations
10. Keep your response concise and focused on improving the prompt content only`;

    const refinementAddition = isRefinement ? `

IMPORTANT: This is an iterative refinement. The prompt has already been refined once.
You MUST:
1. Build upon the previous refinement, don't repeat it
2. Add more specific details, examples, or structure
3. Consider additional aspects the previous refinement didn't address
4. Make SUBSTANTIAL improvements that noticeably enhance the prompt quality` : '';

    const systemPrompt = baseSystemPrompt + refinementAddition;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add example demonstrations
    const examples = trainingExamples.slice(0, 3);
    for (const example of examples) {
      messages.push({
        role: 'user',
        content: example.context
          ? `Prompt: ${example.rawPrompt}\nContext: ${example.context}`
          : `Prompt: ${example.rawPrompt}`
      });
      messages.push({ role: 'assistant', content: example.enhancedPrompt });
    }

    // Add actual prompt to enhance
    const userMessage = context
      ? `Prompt: ${prompt}\nContext: ${context}`
      : `Prompt: ${prompt}`;

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Abstract enhance internal method - to be implemented by subclasses
   * This is the actual API call logic that will be wrapped by circuit breaker
   */
  protected abstract enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse>;

  /**
   * Public enhance method with circuit breaker and retry
   */
  async enhance(request: EnhancementRequest): Promise<EnhancementResponse> {
    if (!this.enabled) {
      throw new Error(`${this.name} provider is not configured`);
    }

    // Initialize circuit breaker on first use
    this.initializeCircuitBreaker();

    try {
      // Check if circuit is open
      if (this.circuitBreaker?.isOpen()) {
        throw new Error(`Circuit breaker is OPEN for ${this.name} (too many recent failures)`);
      }

      // Execute through circuit breaker (which includes timeout)
      const response = await this.circuitBreaker!.execute(request);
      return response;
    } catch (error) {
      console.error(`[${this.name}] Enhancement failed:`, error);
      throw error;
    }
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      // Check circuit breaker state
      if (this.circuitBreaker?.isOpen()) {
        return false;
      }

      // Simple ping with minimal prompt (bypass circuit breaker for health check)
      const response = await this.enhanceInternal({
        prompt: 'test',
        context: undefined,
        isRefinement: false
      });
      return !!response.enhancedPrompt;
    } catch {
      return false;
    }
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return this.circuitBreaker?.getMetrics();
  }

  /**
   * Validate response
   */
  protected validateResponse(enhancedPrompt: string, originalPrompt: string): void {
    if (!enhancedPrompt || enhancedPrompt.trim() === '') {
      throw new Error(`${this.name}: Empty response received`);
    }

    if (enhancedPrompt === originalPrompt) {
      throw new Error(`${this.name}: Returned identical prompt`);
    }
  }
}

// ============================================================================
// DEEPSEEK PROVIDER
// ============================================================================

export class DeepSeekProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'deepseek';
  protected get config(): ProviderConfig {
    return getDeepseekConfig();
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`DeepSeek API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const enhancedPrompt = data.choices[0].message.content;

    this.validateResponse(enhancedPrompt, request.prompt);

    return {
      enhancedPrompt,
      source: 'deepseek',
      metadata: {
        model: this.config.model,
        usage: data.usage,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// MISTRAL PROVIDER
// ============================================================================

export class MistralProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'mistral';
  protected get config(): ProviderConfig {
    return getMistralConfig();
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Mistral API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const enhancedPrompt = data.choices[0].message.content;

    this.validateResponse(enhancedPrompt, request.prompt);

    return {
      enhancedPrompt,
      source: 'mistral',
      metadata: {
        model: this.config.model,
        usage: data.usage,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// GEMINI PROVIDER
// ============================================================================

export class GeminiProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'gemini';
  protected get config(): ProviderConfig {
    return getGeminiConfig();
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);

    // Extract system prompt and user message
    const systemPrompt = messages[0].content;
    const userMessage = messages[messages.length - 1].content;

    const response = await fetch(`${this.config.endpoint}?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userMessage }]
          }
        ],
        systemInstruction: { text: systemPrompt },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const enhancedPrompt = data.candidates[0].content.parts[0].text;

    this.validateResponse(enhancedPrompt, request.prompt);

    return {
      enhancedPrompt,
      source: 'gemini',
      metadata: {
        model: this.config.model,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// LOCAL FALLBACK PROVIDER
// ============================================================================

export class LocalProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'local';
  protected config: ProviderConfig = {
    apiKey: '',
    endpoint: '',
    model: 'local-fallback',
    enabled: true // Always enabled as fallback
  };

  buildMessages(request: EnhancementRequest): ChatMessage[] {
    // Local provider doesn't use messages
    return [];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const { prompt, context } = request;
    const startTime = Date.now();

    // Import local enhancer
    const { enhancePrompt: localEnhance } = await import('../prompt-enhancer-v2');
    const enhancedPrompt = await localEnhance(prompt, context || '');

    return {
      enhancedPrompt,
      source: 'local',
      metadata: {
        model: 'local-fallback',
        processingTime: Date.now() - startTime
      }
    };
  }

  async isHealthy(): Promise<boolean> {
    return true; // Local provider is always healthy
  }
}

// ============================================================================
// PROVIDER FACTORY
// ============================================================================

export class LLMProviderFactory {
  private static providers: Map<ProviderSource, ILLMProvider> = new Map();

  /**
   * Clear provider cache to force re-initialization
   * Used when environment changes at runtime
   */
  static clearProviders(): void {
    this.providers.clear();
  }

  /**
   * Get provider instance (singleton pattern)
   */
  static getProvider(name: ProviderSource): ILLMProvider {
    if (!this.providers.has(name)) {
      switch (name) {
        case 'deepseek':
          this.providers.set(name, new DeepSeekProvider());
          break;
        case 'mistral':
          this.providers.set(name, new MistralProvider());
          break;
        case 'gemini':
          this.providers.set(name, new GeminiProvider());
          break;
        case 'local':
          this.providers.set(name, new LocalProvider());
          break;
        default:
          throw new Error(`Unknown provider: ${name}`);
      }
    }

    return this.providers.get(name)!;
  }

  /**
   * Get fallback chain of providers
   */
  static getProviderChain(): ILLMProvider[] {
    console.log('[LLM Factory] Building provider chain...');
    console.log('[LLM Factory] Provider priority:', providerPriority);

    const allProviders = providerPriority.map(name => {
      const provider = this.getProvider(name);
      console.log(`[LLM Factory] Provider ${name}: enabled=${provider.enabled}`);
      return provider;
    });

    const enabledProviders = allProviders.filter(provider => provider.enabled);
    console.log(`[LLM Factory] Enabled providers: ${enabledProviders.map(p => p.name).join(', ')}`);

    return enabledProviders;
  }

  /**
   * Enhance with automatic fallback
   */
  static async enhanceWithFallback(request: EnhancementRequest): Promise<EnhancementResponse> {
    const providers = this.getProviderChain();
    const errors: Error[] = [];

    for (const provider of providers) {
      try {
        console.log(`[LLM Factory] Trying ${provider.name}...`);
        const response = await provider.enhance(request);
        console.log(`[LLM Factory] ✓ Success with ${provider.name}`);
        return response;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Skip to next provider if circuit is open
        if (errorMessage.includes('Circuit breaker is OPEN')) {
          console.warn(`[LLM Factory] ⊗ ${provider.name} circuit is OPEN, skipping to next provider`);
        } else {
          console.warn(`[LLM Factory] ✗ ${provider.name} failed:`, error);
        }

        errors.push(error as Error);
        // Continue to next provider
      }
    }

    // All providers failed
    throw new Error(`All providers failed: ${errors.map(e => e.message).join('; ')}`);
  }

  /**
   * Get all circuit breaker metrics
   */
  static getAllMetrics() {
    const metrics: any[] = [];

    for (const [name, provider] of this.providers.entries()) {
      if (provider instanceof BaseLLMProvider) {
        const providerMetrics = provider.getMetrics();
        if (providerMetrics) {
          metrics.push(providerMetrics);
        }
      }
    }

    return metrics;
  }

  /**
   * Get health status of all providers
   */
  static async getHealthStatus() {
    const statuses: Record<string, { healthy: boolean; enabled: boolean; circuitState?: string }> = {};

    for (const name of providerPriority) {
      const provider = this.getProvider(name);
      const healthy = await provider.isHealthy();

      let circuitState = undefined;
      if (provider instanceof BaseLLMProvider) {
        const metrics = provider.getMetrics();
        circuitState = metrics?.state;
      }

      statuses[name] = {
        healthy,
        enabled: provider.enabled,
        circuitState
      };
    }

    return statuses;
  }
}
