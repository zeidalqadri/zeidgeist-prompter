import { LLMProviderFactory, SafetyValidator, CostAwareOptimizer, DEFAULT_COST_CONFIG, COST_PRESETS } from '@mstprmpt/engine';
import type { EnhancementRequest, EnhancementResponse, CostOptimizationConfig } from '@mstprmpt/engine';
import { createDb, enhancementLogs } from '@mstprmpt/db';

const safetyValidator = new SafetyValidator();
const costOptimizer = new CostAwareOptimizer();

export interface EnhanceInput {
  prompt: string;
  context?: string;
  costPreset?: string;
  lambda?: number;
  preferredProvider?: string;
}

export interface EnhanceResult {
  id: string;
  enhancedPrompt: string;
  source: string;
  metadata: {
    model?: string;
    processingTimeMs: number;
    inputTokens?: number;
    outputTokens?: number;
    reasoning?: { analysis?: string; planning?: string };
    attemptedProviders?: string[];
  };
}

export async function enhance(
  input: EnhanceInput,
  orgId: string,
  apiKeyId: string,
  planTier: string,
): Promise<EnhanceResult> {
  const startTime = Date.now();

  // Safety validation
  const safetyResult = safetyValidator.validateSafety(input.prompt);
  if (safetyResult.riskLevel === 'critical') {
    throw new EnhanceError('SAFETY_BLOCKED', 'Prompt was blocked by safety filters', 400);
  }

  // Build cost config — free tier forced to costSavings preset
  let costConfig: Partial<CostOptimizationConfig> = {};
  if (planTier === 'free') {
    costConfig = COST_PRESETS['costSavings']?.config ?? DEFAULT_COST_CONFIG;
  } else if (input.costPreset && input.costPreset in COST_PRESETS) {
    costConfig = COST_PRESETS[input.costPreset]?.config ?? DEFAULT_COST_CONFIG;
  } else if (input.lambda !== undefined) {
    costConfig = { ...DEFAULT_COST_CONFIG, lambda: input.lambda };
  }

  const request: EnhancementRequest = {
    prompt: input.prompt,
    context: input.context,
    costConfig,
    preferredProvider: input.preferredProvider as EnhancementRequest['preferredProvider'],
  };

  const response = await LLMProviderFactory.enhanceWithFallback(request);

  const processingTimeMs = Date.now() - startTime;
  const usage = response.metadata?.usage as Record<string, number> | undefined;

  // Log enhancement (fire-and-forget)
  logEnhancement(orgId, apiKeyId, input, response, processingTimeMs).catch(() => {});

  return {
    id: crypto.randomUUID(),
    enhancedPrompt: response.enhancedPrompt,
    source: response.source,
    metadata: {
      model: response.metadata?.model,
      processingTimeMs,
      inputTokens: usage?.['prompt_tokens'] ?? usage?.['input_tokens'],
      outputTokens: usage?.['completion_tokens'] ?? usage?.['output_tokens'],
      reasoning: response.metadata?.reasoning,
      attemptedProviders: response.metadata?.attemptedProviders,
    },
  };
}

async function logEnhancement(
  orgId: string,
  apiKeyId: string,
  input: EnhanceInput,
  response: EnhancementResponse,
  processingTimeMs: number,
): Promise<void> {
  const db = createDb();
  const usage = response.metadata?.usage as Record<string, number> | undefined;

  await db.insert(enhancementLogs).values({
    orgId,
    apiKeyId,
    promptLength: input.prompt.length,
    hasContext: !!input.context,
    source: response.source,
    model: response.metadata?.model,
    inputTokens: usage?.['prompt_tokens'] ?? usage?.['input_tokens'],
    outputTokens: usage?.['completion_tokens'] ?? usage?.['output_tokens'],
    responseTimeMs: processingTimeMs,
    costPreset: input.costPreset,
    statusCode: 200,
  });
}

export class EnhanceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'EnhanceError';
  }
}
