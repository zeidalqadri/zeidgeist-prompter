/**
 * Cost-Aware Optimization Configuration
 *
 * Implements Promptomatix-style lambda (λ) parameter for balancing
 * prompt quality vs. token cost/length.
 *
 * Optimization objective: Score = Quality - (λ × TokenCount/1000)
 *
 * Research shows λ=0.005-0.010 reduces prompt length by ~43%
 * while maintaining 99.9% of peak performance.
 */

export interface CostOptimizationConfig {
  /** Lambda parameter: 0.0 (max quality) to 0.02 (max cost savings). Default: 0.007 */
  lambda: number;

  /** Enable post-processing compression. Default: true */
  enablePostProcessing: boolean;

  /** Minimum quality score to maintain (0-1). Default: 0.7 */
  minQualityThreshold: number;

  /** Maximum compression ratio allowed (0-1). Default: 0.5 (50% reduction max) */
  maxCompressionRatio: number;
}

export interface CostPreset {
  name: string;
  label: string;
  description: string;
  config: CostOptimizationConfig;
}

/**
 * Default lambda value for cost optimization
 * Research shows λ=0.007 provides optimal balance between quality and cost
 */
const DEFAULT_LAMBDA = 0.007;

/**
 * Default configuration - balanced quality and cost
 * Note: Uses static defaults for Cloudflare Workers compatibility
 * (process.env is not available in Workers runtime)
 */
export const DEFAULT_COST_CONFIG: CostOptimizationConfig = {
  lambda: DEFAULT_LAMBDA,
  enablePostProcessing: true,
  minQualityThreshold: 0.7,
  maxCompressionRatio: 0.5
};

/**
 * Create cost config from runtime environment
 * Use this in Cloudflare Workers to read from env object
 */
export function createCostConfigFromEnv(env?: Record<string, string | undefined>): CostOptimizationConfig {
  const lambdaEnv = env?.DEFAULT_LAMBDA;
  return {
    lambda: lambdaEnv ? parseFloat(lambdaEnv) : DEFAULT_LAMBDA,
    enablePostProcessing: true,
    minQualityThreshold: 0.7,
    maxCompressionRatio: 0.5
  };
}

/**
 * Cost optimization presets for different use cases
 */
export const COST_PRESETS: Record<string, CostPreset> = {
  maxQuality: {
    name: 'maxQuality',
    label: 'Max Quality',
    description: 'No length optimization - maximum enhancement quality',
    config: {
      lambda: 0.0,
      enablePostProcessing: false,
      minQualityThreshold: 0.0,
      maxCompressionRatio: 0.0
    }
  },
  balanced: {
    name: 'balanced',
    label: 'Balanced',
    description: 'Optimal balance between quality and token efficiency',
    config: {
      lambda: 0.007,
      enablePostProcessing: true,
      minQualityThreshold: 0.7,
      maxCompressionRatio: 0.5
    }
  },
  costEfficient: {
    name: 'costEfficient',
    label: 'Cost Efficient',
    description: 'Prioritize shorter prompts while maintaining good quality',
    config: {
      lambda: 0.010,
      enablePostProcessing: true,
      minQualityThreshold: 0.65,
      maxCompressionRatio: 0.6
    }
  },
  aggressive: {
    name: 'aggressive',
    label: 'Aggressive',
    description: 'Maximum compression for lowest API costs',
    config: {
      lambda: 0.015,
      enablePostProcessing: true,
      minQualityThreshold: 0.6,
      maxCompressionRatio: 0.7
    }
  }
};

/**
 * Get preset by name, or return default config
 */
export function getPresetConfig(presetName: string): CostOptimizationConfig {
  const preset = COST_PRESETS[presetName];
  return preset ? preset.config : DEFAULT_COST_CONFIG;
}

/**
 * Validate and clamp lambda value to valid range
 */
export function validateLambda(lambda: number): number {
  if (typeof lambda !== 'number' || isNaN(lambda)) {
    return DEFAULT_COST_CONFIG.lambda;
  }
  return Math.min(Math.max(lambda, 0), 0.02);
}

/**
 * Create a custom config with validated values
 */
export function createCostConfig(options: Partial<CostOptimizationConfig>): CostOptimizationConfig {
  return {
    lambda: validateLambda(options.lambda ?? DEFAULT_COST_CONFIG.lambda),
    enablePostProcessing: options.enablePostProcessing ?? DEFAULT_COST_CONFIG.enablePostProcessing,
    minQualityThreshold: Math.min(Math.max(options.minQualityThreshold ?? DEFAULT_COST_CONFIG.minQualityThreshold, 0), 1),
    maxCompressionRatio: Math.min(Math.max(options.maxCompressionRatio ?? DEFAULT_COST_CONFIG.maxCompressionRatio, 0), 1)
  };
}
