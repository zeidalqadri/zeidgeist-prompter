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
  ReasoningMetadata,
  ChatMessage,
  ProviderSource,
  ProviderConfig
} from './types';
import {
  getClaudeConfig,
  getOpenAIConfig,
  getDeepseekConfig,
  getMistralConfig,
  getMoonshotConfig,
  getGeminiConfig,
  providerPriority,
  claudeModels,
  openaiModels,
  mistralModels,
  moonshotModels,
  geminiModels
} from './llm-config';
import {
  analyzePrompt,
  selectModelTier,
  analyzePromptWithStrategy,
  selectModelTierWithStrategy
} from './prompt-analyzer';
import { selectProviderOrder } from './provider-selector';
import { ReasoningStrategy } from './reasoning-strategy';
import {
  getStrategySystemPrompt,
  getStrategyPromptContent,
  parseStrategyResponse
} from '../../../prompts/strategy-system-prompts';
import {
  CHAIN_OF_THOUGHT_ENHANCEMENT_PROMPT,
  ITERATIVE_REFINEMENT_PROMPT
} from '../../../prompts/enhanced-system-prompts';
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
  protected lastExtractedReasoning?: ReasoningMetadata;

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
   * Initialize circuit breaker for provider.
   * Uses createBreaker (not getBreaker) to replace any stale breaker from
   * a previous provider instance that was destroyed by clearProviders().
   */
  protected initializeCircuitBreaker(): void {
    if (!this.circuitBreaker) {
      this.circuitBreaker = CircuitBreakerFactory.createBreaker(
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
   * Select appropriate model tier based on prompt complexity
   * Can be overridden by subclasses for provider-specific logic
   */
  protected selectModel(request: EnhancementRequest): string {
    // Analyze prompt to determine appropriate model tier
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    console.log(`[${this.name}] Prompt analysis:`, {
      complexity: analysis.complexity,
      length: analysis.totalLength,
      tier,
      taskType: analysis.taskType
    });

    // Default: return config model (subclasses should override)
    return this.config.model;
  }

  /**
   * Max tokens for output generation.
   * Fixed at 4096 to prevent truncation, especially when CoT reasoning
   * sections (analysis, planning) precede the enhanced prompt.
   */
  protected calculateMaxTokens(_request: EnhancementRequest): number {
    return 4096;
  }

  /**
   * Build messages for prompt enhancement
   * Uses Chain-of-Thought enhanced prompts for better quality
   */
  buildMessages(request: EnhancementRequest): ChatMessage[] {
    const { prompt, context, isRefinement = false } = request;

    // Use imported enhanced system prompts based on whether this is a refinement
    const systemPrompt = isRefinement
      ? ITERATIVE_REFINEMENT_PROMPT.content
      : CHAIN_OF_THOUGHT_ENHANCEMENT_PROMPT.content;

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

    // Add actual prompt to enhance with clear delimiters
    const userMessage = context
      ? `<<<TEXT_TO_ENHANCE>>>
${prompt}
<<<END_TEXT_TO_ENHANCE>>>

<<<CONTEXT>>>
${context}
<<<END_CONTEXT>>>

Remember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`
      : `<<<TEXT_TO_ENHANCE>>>
${prompt}
<<<END_TEXT_TO_ENHANCE>>>

Remember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`;

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Build messages with strategy-aware system prompt
   *
   * Uses the detected reasoning strategy to select appropriate prompts
   * (Phase 2: Automatic Module Selection)
   */
  buildMessagesWithStrategy(
    request: EnhancementRequest,
    strategy: ReasoningStrategy
  ): ChatMessage[] {
    const { prompt, context, isRefinement = false } = request;

    // Get strategy-specific system prompt
    const strategyPrompt = getStrategyPromptContent(strategy);

    // Add refinement instructions if needed
    const refinementAddition = isRefinement ? `

IMPORTANT: This is an iterative refinement. The prompt has already been refined once.
Build upon the previous enhancement with substantial improvements.` : '';

    const systemPrompt = strategyPrompt + refinementAddition;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Add fewer examples for strategy prompts (they're already more detailed)
    const examples = trainingExamples.slice(0, 2);
    for (const example of examples) {
      messages.push({
        role: 'user',
        content: example.context
          ? `Prompt: ${example.rawPrompt}\nContext: ${example.context}`
          : `Prompt: ${example.rawPrompt}`
      });
      messages.push({ role: 'assistant', content: example.enhancedPrompt });
    }

    // Add actual prompt to enhance with clear delimiters
    const userMessage = context
      ? `<<<TEXT_TO_ENHANCE>>>
${prompt}
<<<END_TEXT_TO_ENHANCE>>>

<<<CONTEXT>>>
${context}
<<<END_CONTEXT>>>

Remember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`
      : `<<<TEXT_TO_ENHANCE>>>
${prompt}
<<<END_TEXT_TO_ENHANCE>>>

Remember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`;

    messages.push({ role: 'user', content: userMessage });

    return messages;
  }

  /**
   * Parse response based on strategy
   *
   * Extracts the final enhanced prompt from strategy-formatted responses
   */
  protected parseStrategyResponse(response: string, strategy: ReasoningStrategy): string {
    return parseStrategyResponse(response, strategy);
  }

  /**
   * Parse enhanced response from XML-structured output.
   *
   * Extracts the enhanced prompt from <enhanced> or <refined> tags,
   * handles truncated tags (when max_tokens cuts off the closing tag),
   * and extracts reasoning metadata (analysis, planning) for storage.
   */
  protected parseEnhancedResponse(response: string): string {
    // Extract reasoning sections before cleaning
    const analysisMatch = response.match(/<analysis>([\s\S]*?)<\/analysis>/i);
    const planningMatch = response.match(/<planning>([\s\S]*?)<\/planning>/i);
    const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i);

    const reasoning: ReasoningMetadata = {};
    if (analysisMatch) reasoning.analysis = analysisMatch[1].trim();
    if (thinkingMatch && !reasoning.analysis) reasoning.analysis = thinkingMatch[1].trim();
    if (planningMatch) reasoning.planning = planningMatch[1].trim();

    this.lastExtractedReasoning = (reasoning.analysis || reasoning.planning) ? reasoning : undefined;

    // Try complete <enhanced> tag
    const enhancedMatch = response.match(/<enhanced>([\s\S]*?)<\/enhanced>/i);
    if (enhancedMatch) {
      return enhancedMatch[1].trim();
    }

    // Try complete <refined> tag (iterative refinement)
    const refinedMatch = response.match(/<refined>([\s\S]*?)<\/refined>/i);
    if (refinedMatch) {
      return refinedMatch[1].trim();
    }

    // Handle truncated <enhanced> tag (output cut off before closing tag)
    const truncatedEnhancedMatch = response.match(/<enhanced>([\s\S]+)$/i);
    if (truncatedEnhancedMatch) {
      return truncatedEnhancedMatch[1].trim();
    }

    // Handle truncated <refined> tag
    const truncatedRefinedMatch = response.match(/<refined>([\s\S]+)$/i);
    if (truncatedRefinedMatch) {
      return truncatedRefinedMatch[1].trim();
    }

    // Fallback: strip reasoning XML tags and their content, then clean
    let cleaned = response.trim();

    // Remove complete reasoning sections
    cleaned = cleaned
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
      .replace(/<planning>[\s\S]*?<\/planning>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<improvements>[\s\S]*?<\/improvements>/gi, '')
      .trim();

    // Remove any remaining orphaned XML tags
    cleaned = cleaned
      .replace(/<\/?(?:analysis|planning|thinking|enhanced|refined|improvements)>/gi, '')
      .trim();

    // Strip meta-text prefixes that LLMs sometimes add
    const metaPatterns = [
      /^(Here's the|Here is the)\s+(enhanced|refined|improved)\s+prompt:\s+/i,
      /^(The|This)\s+(enhanced|refined|improved)\s+prompt\s+is:\s+/i,
      /^(Enhanced|Refined|Improved)\s+prompt:\s+/i,
      /^\*\*(Enhanced|Refined|Improved)\s+Prompt\*\*:\s+/i
    ];

    for (const pattern of metaPatterns) {
      const match = cleaned.match(pattern);
      if (match && cleaned.length > match[0].length) {
        cleaned = cleaned.replace(pattern, '');
        break;
      }
    }

    return cleaned.trim();
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
      // Check if circuit is open - don't retry if circuit is open
      if (this.circuitBreaker?.isOpen()) {
        throw new Error(`Circuit breaker is OPEN for ${this.name} (too many recent failures)`);
      }

      // Execute through retry policy wrapping circuit breaker
      // Retry policy handles transient errors (network, timeout)
      // Circuit breaker handles persistent failures
      const response = await this.retryPolicy.execute(
        async () => this.circuitBreaker!.execute(request)
      );

      // Attach extracted reasoning to response metadata (from parseEnhancedResponse)
      if (this.lastExtractedReasoning) {
        response.metadata = {
          ...response.metadata,
          reasoning: this.lastExtractedReasoning
        };
        this.lastExtractedReasoning = undefined;
      }

      return response;
    } catch (error) {
      console.error(`[${this.name}] Enhancement failed:`, error);
      throw error;
    }
  }

  /**
   * Health check result with detailed error info
   */
  async getHealthCheckResult(): Promise<{
    healthy: boolean;
    errorCategory?: string;
    errorMessage?: string;
    responseTimeMs?: number;
  }> {
    if (!this.enabled) {
      return { healthy: false, errorCategory: 'disabled', errorMessage: 'Provider not configured' };
    }

    try {
      // Check circuit breaker state
      if (this.circuitBreaker?.isOpen()) {
        console.log(`[${this.name}] Health check: circuit breaker is OPEN`);
        return { healthy: false, errorCategory: 'circuit_open', errorMessage: 'Circuit breaker is open due to recent failures' };
      }

      console.log(`[${this.name}] Health check: starting...`);
      const startTime = Date.now();

      // Use skipValidation to avoid anti-answering detection failing health checks
      const response = await this.enhanceInternal({
        prompt: 'Create a website homepage',
        context: undefined,
        isRefinement: false,
        skipValidation: true
      });

      const duration = Date.now() - startTime;
      console.log(`[${this.name}] Health check: SUCCESS in ${duration}ms`);
      return { healthy: !!response.enhancedPrompt, responseTimeMs: duration };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : 'Unknown';

      // Categorize the error for easier debugging
      let category = 'unknown';
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted') || errorName === 'TimeoutError') {
        category = 'timeout';
      } else if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
        category = 'auth';
      } else if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        category = 'rate_limit';
      } else if (errorMessage.includes('ENOTFOUND') || errorMessage.includes('ECONNREFUSED')) {
        category = 'network';
      } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
        category = 'server_error';
      }

      console.error(`[${this.name}] Health check FAILED [${category}]: ${errorMessage}`);
      return { healthy: false, errorCategory: category, errorMessage };
    }
  }

  /**
   * Simple health check (backwards compatible)
   */
  async isHealthy(): Promise<boolean> {
    const result = await this.getHealthCheckResult();
    return result.healthy;
  }

  /**
   * Get circuit breaker metrics
   */
  getMetrics() {
    return this.circuitBreaker?.getMetrics();
  }

  /**
   * Validate response
   *
   * @param skipValidation - If true, skips anti-answering detection (used for health checks)
   */
  protected validateResponse(enhancedPrompt: string, originalPrompt: string, skipValidation = false): void {
    if (!enhancedPrompt || enhancedPrompt.trim() === '') {
      throw new Error(`${this.name}: Empty response received`);
    }

    if (enhancedPrompt === originalPrompt) {
      throw new Error(`${this.name}: Returned identical prompt`);
    }

    // Skip anti-answering detection for health checks
    if (skipValidation) {
      return;
    }

    // Check for answering behavior (response looks like it's answering the prompt instead of enhancing it)
    const answeringCheck = this.detectAnsweringBehavior(enhancedPrompt, originalPrompt);
    if (answeringCheck.isLikelyAnswering) {
      console.warn(`${this.name}: Response appears to be answering rather than enhancing`, answeringCheck.indicators);
      throw new Error(`${this.name}: Response appears to answer the prompt rather than enhance it`);
    }
  }

  /**
   * Detect if the response appears to be answering the prompt rather than enhancing it
   */
  protected detectAnsweringBehavior(response: string, original: string): { isLikelyAnswering: boolean; indicators: string[] } {
    const indicators: string[] = [];

    // Check 1: Response is excessively long compared to original (8x+ is suspicious)
    if (response.length > original.length * 8 && response.length > 1000) {
      indicators.push('excessive_length');
    }

    // Check 2: Contains day-by-day or step-by-step execution content (indicative of answering)
    const executionPatterns = [
      /^Day\s+\d+:/im,           // Day 1:, Day 2:, etc.
      /^Step\s+\d+:/im,          // Step 1:, Step 2:, etc.
      /^First,\s+you\s+/im,      // First, you should...
      /^Here's\s+(?:a|the|your|my)\s+/im,  // Here's a/the plan...
      /^Here\s+is\s+(?:a|the|your|my)\s+/im, // Here is the answer...
      /I\s+recommend\s+(?:that\s+)?you/i, // I recommend you...
      /You\s+should\s+(?:start|begin|first)/i, // You should start by...
      /To\s+(?:do|achieve|accomplish)\s+this/i, // To do this...
      /Let\s+me\s+(?:help|explain|provide)/i  // Let me help you...
    ];

    const executionMatches = executionPatterns.filter(p => p.test(response));
    if (executionMatches.length >= 2) {
      indicators.push('execution_language');
    }

    // Check 3: Missing prompt-like imperative language
    const promptIndicators = [
      /(?:include|including|encompass|cover):/i,
      /(?:provide|create|write|develop|design|build|generate)\s+(?:a|an|the)/i,
      /requirements?:|specifications?:|criteria:/i,
      /format:|structure:|organize:/i
    ];

    const hasPromptLanguage = promptIndicators.some(p => p.test(response));
    if (!hasPromptLanguage && response.length > 500) {
      indicators.push('missing_prompt_language');
    }

    // Check 4: Contains specific recommendations or advice (answering behavior)
    const advicePatterns = [
      /I\s+(?:suggest|advise|recommend)\s+/i,
      /You\s+(?:can|could|should|might)\s+(?:try|visit|go|eat|see|check)/i,
      /(?:Don't|Do\s+not)\s+forget\s+to/i,
      /Make\s+sure\s+(?:to|you)/i
    ];

    const adviceMatches = advicePatterns.filter(p => p.test(response));
    if (adviceMatches.length >= 2) {
      indicators.push('advice_language');
    }

    // Determine if this is likely an "answer" vs an "enhancement"
    // Need at least 2 indicators to flag as answering
    return {
      isLikelyAnswering: indicators.length >= 2,
      indicators
    };
  }
}

// ============================================================================
// CLAUDE PROVIDER (ANTHROPIC)
// ============================================================================

export class ClaudeProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'claude';
  protected get config(): ProviderConfig {
    return getClaudeConfig();
  }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    const modelMap = {
      small: claudeModels.small,
      medium: claudeModels.medium,
      large: claudeModels.large
    };

    const selectedModel = modelMap[tier];
    console.log(`[Claude] Selected model: ${selectedModel} (tier: ${tier}, complexity: ${analysis.complexity})`);
    return selectedModel;
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    // Extract system prompt and user messages
    const systemPrompt = messages[0].content;
    const userMessages = messages.slice(1).filter(msg => msg.role === 'user' || msg.role === 'assistant');

    // Build Anthropic messages format (alternating user/assistant)
    const anthropicMessages = userMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const maxTokens = this.calculateMaxTokens(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.2,
        system: systemPrompt,
        messages: anthropicMessages
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`Claude API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.content[0].text;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

    return {
      enhancedPrompt,
      source: 'claude',
      metadata: {
        model,
        usage: data.usage,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// OPENAI PROVIDER
// ============================================================================

export class OpenAIProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'openai';
  protected get config(): ProviderConfig {
    return getOpenAIConfig();
  }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    const modelMap = {
      small: openaiModels.small,
      medium: openaiModels.medium,
      large: openaiModels.large
    };

    const selectedModel = modelMap[tier];
    console.log(`[OpenAI] Selected model: ${selectedModel} (tier: ${tier}, complexity: ${analysis.complexity})`);
    return selectedModel;
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    const maxTokens = this.calculateMaxTokens(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.choices[0].message.content;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

    return {
      enhancedPrompt,
      source: 'openai',
      metadata: {
        model,
        usage: data.usage,
        processingTime: Date.now() - startTime
      }
    };
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

    const maxTokens = this.calculateMaxTokens(request);

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
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`DeepSeek API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.choices[0].message.content;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

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

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    const modelMap = {
      small: mistralModels.small,
      medium: mistralModels.medium,
      large: mistralModels.large
    };

    const selectedModel = modelMap[tier];
    console.log(`[Mistral] Selected model: ${selectedModel} (tier: ${tier}, complexity: ${analysis.complexity})`);
    return selectedModel;
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    const maxTokens = this.calculateMaxTokens(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Mistral API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.choices[0].message.content;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

    return {
      enhancedPrompt,
      source: 'mistral',
      metadata: {
        model,
        usage: data.usage,
        processingTime: Date.now() - startTime
      }
    };
  }
}

// ============================================================================
// MOONSHOT PROVIDER
// ============================================================================

export class MoonshotProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'moonshot';
  protected get config(): ProviderConfig {
    return getMoonshotConfig();
  }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    const modelMap = {
      small: moonshotModels.small,
      medium: moonshotModels.medium,
      large: moonshotModels.large
    };

    const selectedModel = modelMap[tier];
    console.log(`[Moonshot] Selected model: ${selectedModel} (tier: ${tier}, complexity: ${analysis.complexity})`);
    return selectedModel;
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    const maxTokens = this.calculateMaxTokens(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as any;
      throw new Error(`Moonshot API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.choices[0].message.content;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

    return {
      enhancedPrompt,
      source: 'moonshot',
      metadata: {
        model,
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

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);

    const modelMap = {
      small: geminiModels.small,
      medium: geminiModels.medium,
      large: geminiModels.large
    };

    const selectedModel = modelMap[tier];
    console.log(`[Gemini] Selected model: ${selectedModel} (tier: ${tier}, complexity: ${analysis.complexity})`);
    return selectedModel;
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    // Extract system prompt and user message
    const systemPrompt = messages[0].content;
    const userMessage = messages[messages.length - 1].content;

    // Update endpoint to use selected model
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const maxTokens = this.calculateMaxTokens(request);

    const response = await fetch(`${endpoint}?key=${this.config.apiKey}`, {
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
        systemInstruction: { parts: [{ text: systemPrompt }] },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_ONLY_HIGH'
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: maxTokens
        }
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(error)}`);
    }

    const data = await response.json() as any;
    const rawResponse = data.candidates[0].content.parts[0].text;
    const enhancedPrompt = this.parseEnhancedResponse(rawResponse);

    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);

    return {
      enhancedPrompt,
      source: 'gemini',
      metadata: {
        model,
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
    let enhancedPrompt = await localEnhance(prompt, context || '');

    // Defense in depth: If enhanced prompt equals input, indicate enhancement was not possible
    // DO NOT append boilerplate - return unchanged with honest metadata
    if (enhancedPrompt.trim() === prompt.trim()) {
      console.warn('[LocalProvider] Enhancement returned unchanged prompt - no pattern matched');
      return {
        enhancedPrompt: prompt,  // Return original - don't fake enhancement
        source: 'local',
        metadata: {
          model: 'local-fallback',
          enhancementFailed: true,
          reason: 'no_pattern_match',
          processingTime: Date.now() - startTime
        }
      };
    }

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
        case 'claude':
          this.providers.set(name, new ClaudeProvider());
          break;
        case 'openai':
          this.providers.set(name, new OpenAIProvider());
          break;
        case 'deepseek':
          this.providers.set(name, new DeepSeekProvider());
          break;
        case 'mistral':
          this.providers.set(name, new MistralProvider());
          break;
        case 'moonshot':
          this.providers.set(name, new MoonshotProvider());
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
   * Get fallback chain of providers (static ordering for health checks)
   */
  static getStaticProviderChain(): ILLMProvider[] {
    console.log('[LLM Factory] Building static provider chain...');

    const allProviders = providerPriority.map(name => {
      const provider = this.getProvider(name);
      return provider;
    });

    return allProviders.filter(provider => provider.enabled);
  }

  /**
   * Get fallback chain of providers with optional dynamic ordering
   *
   * @param request - If provided, uses dynamic ordering based on prompt analysis
   */
  static getProviderChain(request?: EnhancementRequest): ILLMProvider[] {
    // If no request provided, use static priority (for health checks etc.)
    if (!request) {
      return this.getStaticProviderChain();
    }

    // Use dynamic ordering based on prompt analysis
    const selection = selectProviderOrder(request);

    console.log('[LLM Factory] Dynamic provider order:', {
      complexity: selection.analysis.complexity,
      taskType: selection.analysis.taskType,
      strategy: selection.analysis.strategy,
      order: selection.orderedProviders.join(' → ')
    });

    // Map to provider instances, filtering by enabled
    const providers = selection.orderedProviders
      .map(name => this.getProvider(name))
      .filter(provider => provider.enabled);

    return providers;
  }

  /**
   * Enhance with automatic fallback
   * Uses dynamic provider ordering based on prompt complexity
   * Tracks attempted providers for observability
   */
  static async enhanceWithFallback(request: EnhancementRequest): Promise<EnhancementResponse> {
    // Pass request for dynamic ordering based on prompt analysis
    const providers = this.getProviderChain(request);
    const errors: Error[] = [];
    const attemptedProviders: string[] = [];

    console.log(`[LLM Factory] Provider chain: ${providers.map(p => p.name).join(' → ')}`);

    for (const provider of providers) {
      attemptedProviders.push(provider.name);
      try {
        console.log(`[LLM Factory] Trying ${provider.name}...`);
        const response = await provider.enhance(request);
        console.log(`[LLM Factory] ✓ Success with ${provider.name}`);

        // Add attempted providers to metadata for observability
        if (response.metadata) {
          response.metadata.attemptedProviders = attemptedProviders;
        }
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

    // All providers failed - include which providers were attempted
    throw new Error(`All providers failed (tried: ${attemptedProviders.join(', ')}): ${errors.map(e => e.message).join('; ')}`);
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
   * Get health status of all providers with detailed error info
   */
  static async getHealthStatus() {
    const statuses: Record<string, {
      healthy: boolean;
      enabled: boolean;
      circuitState?: string;
      errorCategory?: string;
      errorMessage?: string;
      responseTimeMs?: number;
    }> = {};

    for (const name of providerPriority) {
      const provider = this.getProvider(name);

      let healthResult: {
        healthy: boolean;
        errorCategory?: string;
        errorMessage?: string;
        responseTimeMs?: number;
      };

      if (provider instanceof BaseLLMProvider) {
        healthResult = await provider.getHealthCheckResult();
      } else {
        healthResult = { healthy: await provider.isHealthy() };
      }

      let circuitState = undefined;
      if (provider instanceof BaseLLMProvider) {
        const metrics = provider.getMetrics();
        circuitState = metrics?.state;
      }

      statuses[name] = {
        healthy: healthResult.healthy,
        enabled: provider.enabled,
        circuitState,
        ...(healthResult.errorCategory && { errorCategory: healthResult.errorCategory }),
        ...(healthResult.errorMessage && { errorMessage: healthResult.errorMessage }),
        ...(healthResult.responseTimeMs && { responseTimeMs: healthResult.responseTimeMs })
      };
    }

    return statuses;
  }
}
