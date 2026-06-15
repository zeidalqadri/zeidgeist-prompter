/**
 * LLM Provider Types
 *
 * Shared type definitions for LLM provider abstraction layer
 */

import { CostOptimizationConfig } from '../enhanced-architecture/cost-config';

// Provider source identifier
export type ProviderSource = 'claude' | 'openai' | 'deepseek' | 'mistral' | 'moonshot' | 'gemini' | 'local' | 'fallback';

// Enhancement request
export interface EnhancementRequest {
  prompt: string;
  context?: string;
  isRefinement?: boolean;
  /** Cost optimization configuration */
  costConfig?: Partial<CostOptimizationConfig>;
  /** Skip response validation (for health checks) */
  skipValidation?: boolean;
  /** User-selected provider to try first (falls back to dynamic ordering if unavailable) */
  forcedProvider?: ProviderSource;
}

// Cost metrics for response
export interface CostMetrics {
  originalTokens: number;
  optimizedTokens: number;
  tokensSaved: number;
  percentageSaved: number;
  qualityScore: number;
  optimizationScore: number;
  compressionApplied: boolean;
  lambdaUsed: number;
}

// Chain-of-thought reasoning extracted from LLM response
export interface ReasoningMetadata {
  analysis?: string;
  planning?: string;
}

// Enhancement response
export interface EnhancementResponse {
  enhancedPrompt: string;
  source: ProviderSource;
  metadata?: {
    model?: string;
    usage?: Record<string, unknown>;
    processingTime?: number;
    /** Cost optimization metrics */
    costMetrics?: CostMetrics;
    /** Extracted reasoning from LLM chain-of-thought */
    reasoning?: ReasoningMetadata;
    /** Indicates enhancement failed (e.g., no pattern match in local provider) */
    enhancementFailed?: boolean;
    /** Reason for failure when enhancementFailed is true */
    reason?: string;
    /** Additional error details */
    errorDetails?: string;
    /** Fallback reason when using local provider due to external provider failures */
    fallbackReason?: string;
    /** List of providers attempted before success (for observability) */
    attemptedProviders?: string[];
    /** The provider the user originally requested (set when forcedProvider was specified) */
    requestedProvider?: string;
  };
}

// Provider configuration
export interface ProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
}

// Chat message format (OpenAI-compatible)
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Provider interface
export interface ILLMProvider {
  readonly name: ProviderSource;
  readonly enabled: boolean;

  enhance(request: EnhancementRequest): Promise<EnhancementResponse>;
  buildMessages(request: EnhancementRequest): ChatMessage[];
  isHealthy(): Promise<boolean>;
}

// Provider factory options
export interface ProviderFactoryOptions {
  preferredProvider?: ProviderSource;
  enableFallback?: boolean;
  circuitBreakerEnabled?: boolean;
}

// Enhancement metrics
export interface EnhancementMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  providerUsage: Record<ProviderSource, number>;
  circuitBreakerTrips: number;
}
