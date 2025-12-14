/**
 * Reasoning Strategy Types
 *
 * Defines the reasoning strategies for automatic module selection
 * based on Promptomatix patterns (Predict, CoT, PoT, ReAct).
 *
 * Part of Phase 2: Automatic Module Selection
 */

/**
 * Available reasoning strategies based on task complexity and type
 *
 * - Predict: Direct answer for simple tasks (default)
 * - CoT: Chain-of-Thought for multi-step reasoning
 * - PoT: Program-of-Thought for mathematical/algorithmic tasks
 * - ReAct: Reasoning + Acting for interactive/agentic tasks
 */
export type ReasoningStrategy = 'predict' | 'cot' | 'pot' | 'react';

/**
 * Strategy detection result with confidence scoring
 */
export interface StrategyDetectionResult {
  /** Detected reasoning strategy */
  strategy: ReasoningStrategy;

  /** Confidence score (0.0 to 1.0) */
  confidence: number;

  /** Patterns that triggered this detection */
  matchedPatterns: string[];

  /** Explanation for strategy selection */
  rationale: string;

  /** Alternative strategies with their confidence scores */
  alternatives: Array<{
    strategy: ReasoningStrategy;
    confidence: number;
  }>;
}

/**
 * Strategy configuration for prompt enhancement
 */
export interface StrategyConfig {
  /** The selected strategy */
  strategy: ReasoningStrategy;

  /** Whether to include explicit reasoning steps in output */
  includeSteps: boolean;

  /** Maximum reasoning depth for CoT/PoT */
  maxReasoningDepth: number;

  /** Whether to use structured output format */
  structuredOutput: boolean;

  /** Strategy-specific parameters */
  parameters: StrategyParameters;
}

/**
 * Strategy-specific parameters
 */
export interface StrategyParameters {
  // CoT parameters
  cotStepPrefix?: string;
  cotSummaryRequired?: boolean;

  // PoT parameters
  potLanguage?: 'python' | 'javascript' | 'pseudocode';
  potExecutable?: boolean;

  // ReAct parameters
  reactMaxIterations?: number;
  reactToolsAvailable?: string[];
}

/**
 * Default configurations for each strategy
 */
export const DEFAULT_STRATEGY_CONFIGS: Record<ReasoningStrategy, StrategyConfig> = {
  predict: {
    strategy: 'predict',
    includeSteps: false,
    maxReasoningDepth: 1,
    structuredOutput: false,
    parameters: {}
  },

  cot: {
    strategy: 'cot',
    includeSteps: true,
    maxReasoningDepth: 5,
    structuredOutput: true,
    parameters: {
      cotStepPrefix: 'Step',
      cotSummaryRequired: true
    }
  },

  pot: {
    strategy: 'pot',
    includeSteps: true,
    maxReasoningDepth: 10,
    structuredOutput: true,
    parameters: {
      potLanguage: 'python',
      potExecutable: false
    }
  },

  react: {
    strategy: 'react',
    includeSteps: true,
    maxReasoningDepth: 8,
    structuredOutput: true,
    parameters: {
      reactMaxIterations: 5,
      reactToolsAvailable: ['search', 'calculate', 'lookup']
    }
  }
};

/**
 * Strategy descriptions for UI display and logging
 */
export const STRATEGY_DESCRIPTIONS: Record<ReasoningStrategy, {
  name: string;
  shortDescription: string;
  longDescription: string;
  bestFor: string[];
  icon: string;
}> = {
  predict: {
    name: 'Direct Prediction',
    shortDescription: 'Simple direct answer',
    longDescription: 'Generates a direct response without explicit reasoning steps. Best for straightforward queries that don\'t require complex analysis.',
    bestFor: [
      'Simple factual questions',
      'Basic translations or conversions',
      'Straightforward instructions',
      'Quick completions'
    ],
    icon: '⚡'
  },

  cot: {
    name: 'Chain-of-Thought',
    shortDescription: 'Step-by-step reasoning',
    longDescription: 'Breaks down complex problems into sequential reasoning steps, improving accuracy for multi-step tasks.',
    bestFor: [
      'Multi-step reasoning problems',
      'Analysis and evaluation tasks',
      'Complex decision making',
      'Logical deduction'
    ],
    icon: '🔗'
  },

  pot: {
    name: 'Program-of-Thought',
    shortDescription: 'Computational reasoning',
    longDescription: 'Uses programmatic/algorithmic thinking to solve mathematical, logical, or computational problems.',
    bestFor: [
      'Mathematical calculations',
      'Algorithm design',
      'Data processing tasks',
      'Formula application'
    ],
    icon: '🧮'
  },

  react: {
    name: 'ReAct (Reasoning + Acting)',
    shortDescription: 'Interactive reasoning with actions',
    longDescription: 'Interleaves reasoning with action steps, suitable for tasks requiring information retrieval or external interactions.',
    bestFor: [
      'Information retrieval tasks',
      'Multi-source verification',
      'Interactive research',
      'Tool-using scenarios'
    ],
    icon: '🔄'
  }
};

/**
 * Pattern categories for strategy detection
 */
export interface DetectionPatterns {
  /** Keywords that trigger this strategy */
  keywords: string[];

  /** Regex patterns for more complex matching */
  regexPatterns: RegExp[];

  /** Structural patterns (e.g., presence of numbers, code blocks) */
  structuralPatterns: Array<{
    name: string;
    test: (text: string) => boolean;
  }>;

  /** Negative patterns that reduce confidence */
  negativePatterns: string[];
}

/**
 * Detection pattern sets for each strategy
 */
export const STRATEGY_DETECTION_PATTERNS: Record<ReasoningStrategy, DetectionPatterns> = {
  predict: {
    keywords: [
      'what is', 'define', 'translate', 'convert', 'list',
      'name', 'identify', 'tell me', 'give me'
    ],
    regexPatterns: [
      /^(what|who|where|when)\s+is\s+/i,
      /^(give|tell|show)\s+me\s+/i
    ],
    structuralPatterns: [
      {
        name: 'shortPrompt',
        test: (text: string) => text.length < 50
      }
    ],
    negativePatterns: [
      'step by step', 'explain how', 'calculate', 'search for'
    ]
  },

  cot: {
    keywords: [
      'step-by-step', 'step by step', 'explain', 'reason', 'think through',
      'analyze', 'evaluate', 'compare', 'consider', 'decide',
      'first', 'then', 'finally', 'therefore', 'because'
    ],
    regexPatterns: [
      /\b(explain|analyze|evaluate)\s+(why|how|what)/i,
      /\b(step[- ]?by[- ]?step)\b/i,
      /\b(first|then|finally|therefore)\b.*\b(first|then|finally|therefore)\b/i
    ],
    structuralPatterns: [
      {
        name: 'multipleQuestions',
        test: (text: string) => (text.match(/\?/g) || []).length >= 2
      },
      {
        name: 'sequenceMarkers',
        test: (text: string) => /\b(first|second|third|next|then|finally)\b/i.test(text)
      }
    ],
    negativePatterns: [
      'calculate', 'compute', 'solve equation'
    ]
  },

  pot: {
    keywords: [
      'calculate', 'compute', 'solve', 'equation', 'formula',
      'algorithm', 'mathematical', 'numeric', 'percentage',
      'sum', 'average', 'total', 'multiply', 'divide'
    ],
    regexPatterns: [
      /\b(calculate|compute|solve)\s+/i,
      /\b(equation|formula|algorithm)\b/i,
      /\d+\s*[+\-*/]\s*\d+/,
      /\b(sum|average|total|mean|median)\s+of\b/i
    ],
    structuralPatterns: [
      {
        name: 'hasNumbers',
        test: (text: string) => /\d+(\.\d+)?/.test(text)
      },
      {
        name: 'hasMathOperators',
        test: (text: string) => /[+\-*/=<>]/.test(text)
      },
      {
        name: 'hasPercentage',
        test: (text: string) => /\d+%/.test(text)
      }
    ],
    negativePatterns: [
      'explain why', 'search for', 'find information'
    ]
  },

  react: {
    keywords: [
      'search', 'find', 'look up', 'retrieve', 'verify',
      'current', 'latest', 'recent', 'today', 'now',
      'check', 'confirm', 'validate', 'research'
    ],
    regexPatterns: [
      /\b(search|find|look\s+up)\s+(for|about|on)\b/i,
      /\b(current|latest|recent)\s+\w+/i,
      /\b(verify|confirm|validate)\s+/i,
      /\b(API|database|web|online)\b/i
    ],
    structuralPatterns: [
      {
        name: 'hasUrl',
        test: (text: string) => /https?:\/\//.test(text)
      },
      {
        name: 'multiSourceRequest',
        test: (text: string) => /\b(multiple|different|various)\s+(sources?|places?|sites?)\b/i.test(text)
      }
    ],
    negativePatterns: [
      'calculate', 'compute', 'solve equation'
    ]
  }
};

/**
 * Utility function to get strategy config with overrides
 */
export function getStrategyConfig(
  strategy: ReasoningStrategy,
  overrides?: Partial<StrategyConfig>
): StrategyConfig {
  const defaultConfig = DEFAULT_STRATEGY_CONFIGS[strategy];

  if (!overrides) {
    return { ...defaultConfig };
  }

  return {
    ...defaultConfig,
    ...overrides,
    parameters: {
      ...defaultConfig.parameters,
      ...overrides.parameters
    }
  };
}

/**
 * Validate a strategy string and return the enum value
 */
export function validateStrategy(strategy: string): ReasoningStrategy | null {
  const validStrategies: ReasoningStrategy[] = ['predict', 'cot', 'pot', 'react'];

  if (validStrategies.includes(strategy as ReasoningStrategy)) {
    return strategy as ReasoningStrategy;
  }

  return null;
}

/**
 * Get strategy by complexity level (simple heuristic)
 */
export function getDefaultStrategyForComplexity(
  complexity: 'simple' | 'moderate' | 'complex'
): ReasoningStrategy {
  switch (complexity) {
    case 'simple':
      return 'predict';
    case 'moderate':
      return 'cot';
    case 'complex':
      return 'cot'; // Could be cot or pot depending on task type
    default:
      return 'predict';
  }
}
