import { CostOptimizationConfig } from '../enhanced-architecture/cost-config';

export type ProviderSource = 'claude' | 'openai' | 'deepseek' | 'mistral' | 'moonshot' | 'gemini' | 'local' | 'fallback';

export interface EnhancementRequest {
  prompt: string;
  context?: string;
  isRefinement?: boolean;
  costConfig?: Partial<CostOptimizationConfig>;
  skipValidation?: boolean;
  preferredProvider?: ProviderSource;
}

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

export interface ReasoningMetadata {
  analysis?: string;
  planning?: string;
}

export interface EnhancementResponse {
  enhancedPrompt: string;
  source: ProviderSource;
  metadata?: {
    model?: string;
    usage?: Record<string, unknown>;
    processingTime?: number;
    costMetrics?: CostMetrics;
    reasoning?: ReasoningMetadata;
    enhancementFailed?: boolean;
    reason?: string;
    errorDetails?: string;
    fallbackReason?: string;
    attemptedProviders?: string[];
  };
}

export interface ProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
  timeout?: number;
  maxRetries?: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ILLMProvider {
  readonly name: ProviderSource;
  readonly enabled: boolean;

  enhance(request: EnhancementRequest): Promise<EnhancementResponse>;
  buildMessages(request: EnhancementRequest): ChatMessage[];
  isHealthy(): Promise<boolean>;
}

export interface ProviderFactoryOptions {
  preferredProvider?: ProviderSource;
  enableFallback?: boolean;
  circuitBreakerEnabled?: boolean;
}

export interface EnhancementMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  providerUsage: Record<ProviderSource, number>;
  circuitBreakerTrips: number;
}
