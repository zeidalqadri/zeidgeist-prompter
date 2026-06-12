import { trainingExamples } from '../training-data';
import {
  ILLMProvider, EnhancementRequest, EnhancementResponse, ReasoningMetadata,
  ChatMessage, ProviderSource, ProviderConfig
} from './types';
import {
  getClaudeConfig, getOpenAIConfig, getDeepseekConfig, getMistralConfig,
  getMoonshotConfig, getGeminiConfig, providerPriority,
  claudeModels, openaiModels, deepseekModels, mistralModels, moonshotModels, geminiModels
} from './llm-config';
import { analyzePrompt, selectModelTier } from './prompt-analyzer';
import { selectProviderOrder } from './provider-selector';
import { ReasoningStrategy } from './reasoning-strategy';
import { getStrategyPromptContent, parseStrategyResponse } from '../prompts/strategy-system-prompts';
import { CHAIN_OF_THOUGHT_ENHANCEMENT_PROMPT, ITERATIVE_REFINEMENT_PROMPT } from '../prompts/enhanced-system-prompts';
import { CircuitBreakerFactory } from '../resilience/circuit-breaker';
import { RetryPolicy } from '../resilience/retry-policy';
import type { EnhancedCircuitBreaker } from '../resilience/circuit-breaker';

export abstract class BaseLLMProvider implements ILLMProvider {
  abstract readonly name: ProviderSource;
  protected abstract config: ProviderConfig;
  protected circuitBreaker?: EnhancedCircuitBreaker<EnhancementRequest, EnhancementResponse>;
  protected retryPolicy: RetryPolicy;
  protected lastExtractedReasoning?: ReasoningMetadata;

  constructor() {
    this.retryPolicy = new RetryPolicy({
      maxAttempts: 3, initialDelay: 1000, maxDelay: 10000,
      backoffMultiplier: 2, jitterFactor: 0.1,
      retryableErrors: ['ETIMEDOUT', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']
    });
  }

  get enabled(): boolean {
    return this.config.enabled;
  }

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

  protected selectModel(_request: EnhancementRequest): string {
    return this.config.model;
  }

  protected calculateMaxTokens(_request: EnhancementRequest): number {
    return 4096;
  }

  buildMessages(request: EnhancementRequest): ChatMessage[] {
    const { prompt, context, isRefinement = false } = request;
    const systemPrompt = isRefinement
      ? ITERATIVE_REFINEMENT_PROMPT.content
      : CHAIN_OF_THOUGHT_ENHANCEMENT_PROMPT.content;

    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

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

    const userMessage = context
      ? `<<<TEXT_TO_ENHANCE>>>\n${prompt}\n<<<END_TEXT_TO_ENHANCE>>>\n\n<<<CONTEXT>>>\n${context}\n<<<END_CONTEXT>>>\n\nRemember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`
      : `<<<TEXT_TO_ENHANCE>>>\n${prompt}\n<<<END_TEXT_TO_ENHANCE>>>\n\nRemember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`;

    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  buildMessagesWithStrategy(request: EnhancementRequest, strategy: ReasoningStrategy): ChatMessage[] {
    const { prompt, context, isRefinement = false } = request;
    const strategyPrompt = getStrategyPromptContent(strategy);
    const refinementAddition = isRefinement
      ? '\n\nIMPORTANT: This is an iterative refinement. Build upon the previous enhancement with substantial improvements.'
      : '';
    const systemPrompt = strategyPrompt + refinementAddition;

    const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

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

    const userMessage = context
      ? `<<<TEXT_TO_ENHANCE>>>\n${prompt}\n<<<END_TEXT_TO_ENHANCE>>>\n\n<<<CONTEXT>>>\n${context}\n<<<END_CONTEXT>>>\n\nRemember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`
      : `<<<TEXT_TO_ENHANCE>>>\n${prompt}\n<<<END_TEXT_TO_ENHANCE>>>\n\nRemember: Your output must be ONLY the enhanced/rewritten version of the text above. Do NOT answer it or provide information about its topic.`;

    messages.push({ role: 'user', content: userMessage });
    return messages;
  }

  protected parseStrategyResponse(response: string, strategy: ReasoningStrategy): string {
    return parseStrategyResponse(response, strategy);
  }

  protected parseEnhancedResponse(response: string): string {
    const analysisMatch = response.match(/<analysis>([\s\S]*?)<\/analysis>/i);
    const planningMatch = response.match(/<planning>([\s\S]*?)<\/planning>/i);
    const thinkingMatch = response.match(/<thinking>([\s\S]*?)<\/thinking>/i);

    const reasoning: ReasoningMetadata = {};
    if (analysisMatch) reasoning.analysis = analysisMatch[1].trim();
    if (thinkingMatch && !reasoning.analysis) reasoning.analysis = thinkingMatch[1].trim();
    if (planningMatch) reasoning.planning = planningMatch[1].trim();
    this.lastExtractedReasoning = (reasoning.analysis || reasoning.planning) ? reasoning : undefined;

    const enhancedMatch = response.match(/<enhanced>([\s\S]*?)<\/enhanced>/i);
    if (enhancedMatch) return enhancedMatch[1].trim();

    const refinedMatch = response.match(/<refined>([\s\S]*?)<\/refined>/i);
    if (refinedMatch) return refinedMatch[1].trim();

    const truncatedEnhancedMatch = response.match(/<enhanced>([\s\S]+)$/i);
    if (truncatedEnhancedMatch) return truncatedEnhancedMatch[1].trim();

    const truncatedRefinedMatch = response.match(/<refined>([\s\S]+)$/i);
    if (truncatedRefinedMatch) return truncatedRefinedMatch[1].trim();

    let cleaned = response.trim()
      .replace(/<analysis>[\s\S]*?<\/analysis>/gi, '')
      .replace(/<planning>[\s\S]*?<\/planning>/gi, '')
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
      .replace(/<improvements>[\s\S]*?<\/improvements>/gi, '')
      .trim()
      .replace(/<\/?(?:analysis|planning|thinking|enhanced|refined|improvements)>/gi, '')
      .trim();

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

  protected abstract enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse>;

  async enhance(request: EnhancementRequest): Promise<EnhancementResponse> {
    if (!this.enabled) throw new Error(`${this.name} provider is not configured`);
    this.initializeCircuitBreaker();

    try {
      if (this.circuitBreaker?.isOpen()) {
        throw new Error(`Circuit breaker is OPEN for ${this.name} (too many recent failures)`);
      }
      const response = await this.retryPolicy.execute(
        async () => this.circuitBreaker!.execute(request)
      );
      if (this.lastExtractedReasoning) {
        response.metadata = { ...response.metadata, reasoning: this.lastExtractedReasoning };
        this.lastExtractedReasoning = undefined;
      }
      return response;
    } catch (error) {
      console.error(`[${this.name}] Enhancement failed:`, error);
      throw error;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return false;
    try {
      if (this.circuitBreaker?.isOpen()) return false;
      await this.enhanceInternal({ prompt: 'Create a website homepage', skipValidation: true });
      return true;
    } catch {
      return false;
    }
  }

  getMetrics() {
    return this.circuitBreaker?.getMetrics();
  }

  protected validateResponse(enhancedPrompt: string, originalPrompt: string, skipValidation = false): void {
    if (!enhancedPrompt || enhancedPrompt.trim() === '') {
      throw new Error(`${this.name}: Empty response received`);
    }
    if (enhancedPrompt === originalPrompt) {
      throw new Error(`${this.name}: Returned identical prompt`);
    }
    if (skipValidation) return;

    const indicators: string[] = [];
    if (enhancedPrompt.length > originalPrompt.length * 8 && enhancedPrompt.length > 1000) {
      indicators.push('excessive_length');
    }
    const executionPatterns = [
      /^Day\s+\d+:/im, /^Step\s+\d+:/im, /^First,\s+you\s+/im,
      /^Here's\s+(?:a|the|your|my)\s+/im, /^Here\s+is\s+(?:a|the|your|my)\s+/im,
      /I\s+recommend\s+(?:that\s+)?you/i, /You\s+should\s+(?:start|begin|first)/i,
      /To\s+(?:do|achieve|accomplish)\s+this/i, /Let\s+me\s+(?:help|explain|provide)/i
    ];
    if (executionPatterns.filter(p => p.test(enhancedPrompt)).length >= 2) indicators.push('execution_language');
    const promptIndicators = [
      /(?:include|including|encompass|cover):/i,
      /(?:provide|create|write|develop|design|build|generate)\s+(?:a|an|the)/i,
      /requirements?:|specifications?:|criteria:/i, /format:|structure:|organize:/i
    ];
    if (!promptIndicators.some(p => p.test(enhancedPrompt)) && enhancedPrompt.length > 500) {
      indicators.push('missing_prompt_language');
    }
    const advicePatterns = [
      /I\s+(?:suggest|advise|recommend)\s+/i,
      /You\s+(?:can|could|should|might)\s+(?:try|visit|go|eat|see|check)/i
    ];
    if (advicePatterns.filter(p => p.test(enhancedPrompt)).length >= 2) indicators.push('advice_language');

    if (indicators.length >= 2) {
      throw new Error(`${this.name}: Response appears to answer the prompt rather than enhance it`);
    }
  }
}

// --- Claude Provider ---
export class ClaudeProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'claude';
  protected get config(): ProviderConfig { return getClaudeConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: claudeModels.small, medium: claudeModels.medium, large: claudeModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);
    const systemPrompt = messages[0].content;
    const userMessages = messages.slice(1).filter(msg => msg.role === 'user' || msg.role === 'assistant');
    const anthropicMessages = userMessages.map(msg => ({ role: msg.role, content: msg.content }));

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.config.apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, max_tokens: this.calculateMaxTokens(request), temperature: 0.2, system: systemPrompt, messages: anthropicMessages }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`Claude API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { content: Array<{ text: string }>; usage: Record<string, unknown> };
    const enhancedPrompt = this.parseEnhancedResponse(data.content[0].text);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'claude', metadata: { model, usage: data.usage, processingTime: Date.now() - startTime } };
  }
}

// --- OpenAI Provider ---
export class OpenAIProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'openai';
  protected get config(): ProviderConfig { return getOpenAIConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: openaiModels.small, medium: openaiModels.medium, large: openaiModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: this.calculateMaxTokens(request) }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`OpenAI API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage: Record<string, unknown> };
    const enhancedPrompt = this.parseEnhancedResponse(data.choices[0].message.content);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'openai', metadata: { model, usage: data.usage, processingTime: Date.now() - startTime } };
  }
}

// --- DeepSeek Provider ---
export class DeepSeekProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'deepseek';
  protected get config(): ProviderConfig { return getDeepseekConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: deepseekModels.small, medium: deepseekModels.medium, large: deepseekModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: this.calculateMaxTokens(request) }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`DeepSeek API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage: Record<string, unknown> };
    const enhancedPrompt = this.parseEnhancedResponse(data.choices[0].message.content);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'deepseek', metadata: { model, usage: data.usage, processingTime: Date.now() - startTime } };
  }
}

// --- Mistral Provider ---
export class MistralProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'mistral';
  protected get config(): ProviderConfig { return getMistralConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: mistralModels.small, medium: mistralModels.medium, large: mistralModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: this.calculateMaxTokens(request) }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`Mistral API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage: Record<string, unknown> };
    const enhancedPrompt = this.parseEnhancedResponse(data.choices[0].message.content);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'mistral', metadata: { model, usage: data.usage, processingTime: Date.now() - startTime } };
  }
}

// --- Moonshot Provider ---
export class MoonshotProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'moonshot';
  protected get config(): ProviderConfig { return getMoonshotConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: moonshotModels.small, medium: moonshotModels.medium, large: moonshotModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);
    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: this.calculateMaxTokens(request) }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`Moonshot API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { choices: Array<{ message: { content: string } }>; usage: Record<string, unknown> };
    const enhancedPrompt = this.parseEnhancedResponse(data.choices[0].message.content);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'moonshot', metadata: { model, usage: data.usage, processingTime: Date.now() - startTime } };
  }
}

// --- Gemini Provider ---
export class GeminiProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'gemini';
  protected get config(): ProviderConfig { return getGeminiConfig(); }

  protected selectModel(request: EnhancementRequest): string {
    const analysis = analyzePrompt(request.prompt, request.context);
    const tier = selectModelTier(analysis.complexity, analysis.totalLength);
    const modelMap = { small: geminiModels.small, medium: geminiModels.medium, large: geminiModels.large };
    return modelMap[tier];
  }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const startTime = Date.now();
    const messages = this.buildMessages(request);
    const model = this.selectModel(request);
    const systemPrompt = messages[0].content;
    const userMessage = messages[messages.length - 1].content;
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(`${endpoint}?key=${this.config.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        safetySettings: [{ category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }],
        generationConfig: { temperature: 0.2, maxOutputTokens: this.calculateMaxTokens(request) }
      }),
      signal: AbortSignal.timeout(this.config.timeout || 10000)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' })) as Record<string, unknown>;
      throw new Error(`Gemini API error (${response.status}): ${JSON.stringify(error)}`);
    }
    const data = await response.json() as { candidates: Array<{ content: { parts: Array<{ text: string }> } }> };
    const enhancedPrompt = this.parseEnhancedResponse(data.candidates[0].content.parts[0].text);
    this.validateResponse(enhancedPrompt, request.prompt, request.skipValidation);
    return { enhancedPrompt, source: 'gemini', metadata: { model, processingTime: Date.now() - startTime } };
  }
}

// --- Local Fallback Provider ---
export class LocalProvider extends BaseLLMProvider {
  readonly name: ProviderSource = 'local';
  protected config: ProviderConfig = { apiKey: '', endpoint: '', model: 'local-fallback', enabled: true };

  buildMessages(_request: EnhancementRequest): ChatMessage[] { return []; }

  protected async enhanceInternal(request: EnhancementRequest): Promise<EnhancementResponse> {
    const { prompt, context } = request;
    const startTime = Date.now();
    const { enhancePrompt: localEnhance } = await import('../prompt-enhancer-v2');
    const enhancedPrompt = await localEnhance(prompt, context || '');

    if (enhancedPrompt.trim() === prompt.trim()) {
      return {
        enhancedPrompt: prompt,
        source: 'local',
        metadata: { model: 'local-fallback', enhancementFailed: true, reason: 'no_pattern_match', processingTime: Date.now() - startTime }
      };
    }
    return { enhancedPrompt, source: 'local', metadata: { model: 'local-fallback', processingTime: Date.now() - startTime } };
  }

  async isHealthy(): Promise<boolean> { return true; }
}

// --- Provider Factory ---
export class LLMProviderFactory {
  private static providers: Map<ProviderSource, ILLMProvider> = new Map();

  static clearProviders(): void { this.providers.clear(); }

  static getProvider(name: ProviderSource): ILLMProvider {
    if (!this.providers.has(name)) {
      switch (name) {
        case 'claude': this.providers.set(name, new ClaudeProvider()); break;
        case 'openai': this.providers.set(name, new OpenAIProvider()); break;
        case 'deepseek': this.providers.set(name, new DeepSeekProvider()); break;
        case 'mistral': this.providers.set(name, new MistralProvider()); break;
        case 'moonshot': this.providers.set(name, new MoonshotProvider()); break;
        case 'gemini': this.providers.set(name, new GeminiProvider()); break;
        case 'local': this.providers.set(name, new LocalProvider()); break;
        default: throw new Error(`Unknown provider: ${name}`);
      }
    }
    return this.providers.get(name)!;
  }

  static getProviderChain(request?: EnhancementRequest): ILLMProvider[] {
    if (!request) {
      return providerPriority.map(name => this.getProvider(name)).filter(p => p.enabled);
    }
    const selection = selectProviderOrder(request);
    let ordered = selection.orderedProviders;

    if (request.preferredProvider) {
      const preferred = request.preferredProvider;
      ordered = [preferred, ...ordered.filter(p => p !== preferred)];
    }

    return ordered.map(name => this.getProvider(name)).filter(p => p.enabled);
  }

  static async enhanceWithFallback(request: EnhancementRequest): Promise<EnhancementResponse> {
    const providers = this.getProviderChain(request);
    const errors: Error[] = [];
    const attemptedProviders: string[] = [];

    for (const provider of providers) {
      attemptedProviders.push(provider.name);
      try {
        const response = await provider.enhance(request);
        if (response.metadata) response.metadata.attemptedProviders = attemptedProviders;
        return response;
      } catch (error) {
        errors.push(error as Error);
      }
    }
    throw new Error(`All providers failed (tried: ${attemptedProviders.join(', ')}): ${errors.map(e => e.message).join('; ')}`);
  }

  static async getHealthStatus() {
    const statuses: Record<string, { healthy: boolean; enabled: boolean }> = {};
    for (const name of providerPriority) {
      const provider = this.getProvider(name);
      statuses[name] = { healthy: await provider.isHealthy(), enabled: provider.enabled };
    }
    return statuses;
  }
}
