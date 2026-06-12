import { ProviderConfig, ProviderSource } from './types';

export interface ProviderCapabilities {
  complexReasoning: number;
  speed: number;
  costEfficiency: number;
  taskScores: Record<string, number>;
}

// Capability scores calibrated for prompt enhancement (creative rewriting task).
// Scores reflect June 2026 model generations.
export const PROVIDER_CAPABILITIES: Record<ProviderSource, ProviderCapabilities> = {
  claude: {
    complexReasoning: 1.0, speed: 0.6, costEfficiency: 0.25,
    taskScores: { creative: 30, general: 29, analysis: 29, evaluation: 28, technical: 27, summarization: 26, classification: 22 }
  },
  openai: {
    complexReasoning: 0.95, speed: 0.65, costEfficiency: 0.2,
    taskScores: { creative: 29, general: 28, analysis: 28, evaluation: 27, technical: 29, summarization: 27, classification: 24 }
  },
  deepseek: {
    complexReasoning: 0.9, speed: 0.75, costEfficiency: 0.95,
    taskScores: { creative: 28, general: 27, analysis: 27, evaluation: 25, technical: 29, summarization: 25, classification: 22 }
  },
  gemini: {
    complexReasoning: 0.85, speed: 0.8, costEfficiency: 0.6,
    taskScores: { creative: 27, general: 26, analysis: 26, evaluation: 25, technical: 27, summarization: 26, classification: 24 }
  },
  mistral: {
    complexReasoning: 0.8, speed: 0.8, costEfficiency: 0.85,
    taskScores: { creative: 25, general: 25, analysis: 24, evaluation: 23, technical: 26, summarization: 23, classification: 22 }
  },
  moonshot: {
    complexReasoning: 0.8, speed: 0.6, costEfficiency: 0.5,
    taskScores: { creative: 24, general: 24, analysis: 24, evaluation: 22, technical: 26, summarization: 22, classification: 20 }
  },
  local: {
    complexReasoning: 0.3, speed: 1.0, costEfficiency: 1.0,
    taskScores: { creative: 8, general: 10, analysis: 8, evaluation: 8, technical: 8, summarization: 10, classification: 10 }
  },
  fallback: {
    complexReasoning: 0.2, speed: 1.0, costEfficiency: 1.0,
    taskScores: { creative: 5, general: 8, analysis: 5, evaluation: 5, technical: 5, summarization: 8, classification: 8 }
  }
};

function getEnv(key: string, defaultValue = ''): string {
  return process.env[key] || defaultValue;
}

function hasEnv(key: string): boolean {
  return !!process.env[key];
}

// ---------------------------------------------------------------------------
// MODEL TIERS — June 2026 lineup, optimised for prompt enhancement quality
//
// "small" = cheapest model that still delivers good enhancement quality
// "medium" = best quality/cost balance for moderate complexity
// "large" = highest quality for complex multi-requirement prompts
// ---------------------------------------------------------------------------

// Claude — Haiku 4.5 is excellent for instruction-following at low cost.
// Sonnet 4.6 is the latest balanced model. Opus 4.8 / Fable 5 are overkill.
export const claudeModels = {
  small: 'claude-haiku-4-5-20251001',
  medium: 'claude-sonnet-4-6-20250514',
  large: 'claude-sonnet-4-6-20250514'
} as const;

export function getClaudeConfig(): ProviderConfig {
  return {
    apiKey: getEnv('CLAUDE_API_KEY'),
    endpoint: getEnv('CLAUDE_ENDPOINT', 'https://api.anthropic.com/v1/messages'),
    model: getEnv('CLAUDE_MODEL', claudeModels.small),
    enabled: hasEnv('CLAUDE_API_KEY'),
    timeout: parseInt(getEnv('CLAUDE_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('CLAUDE_MAX_RETRIES', '2'), 10)
  };
}

// OpenAI — GPT-5.4 Mini ($0.75/M in) is a big jump over 4.1-mini for creative tasks.
// GPT-5.4 ($2/M in) for complex prompts. 400K-1.1M context, 128K output.
export const openaiModels = {
  small: 'gpt-5.4-mini',
  medium: 'gpt-5.4',
  large: 'gpt-5.4'
} as const;

export function getOpenAIConfig(): ProviderConfig {
  return {
    apiKey: getEnv('OPENAI_API_KEY'),
    endpoint: getEnv('OPENAI_ENDPOINT', 'https://api.openai.com/v1/chat/completions'),
    model: getEnv('OPENAI_MODEL', openaiModels.small),
    enabled: hasEnv('OPENAI_API_KEY'),
    timeout: parseInt(getEnv('OPENAI_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('OPENAI_MAX_RETRIES', '2'), 10)
  };
}

// DeepSeek — V4 Flash ($0.14/M in) is the best value in the industry.
// V4 Pro ($0.435/M in) for complex prompts. Both have 1M context.
export const deepseekModels = {
  small: 'deepseek-v4-flash',
  medium: 'deepseek-v4-flash',
  large: 'deepseek-v4-pro'
} as const;

export function getDeepseekConfig(): ProviderConfig {
  return {
    apiKey: getEnv('DEEPSEEK_API_KEY'),
    endpoint: getEnv('DEEPSEEK_ENDPOINT', 'https://api.deepseek.com/v1/chat/completions'),
    model: getEnv('DEEPSEEK_MODEL', deepseekModels.small),
    enabled: hasEnv('DEEPSEEK_API_KEY'),
    timeout: parseInt(getEnv('DEEPSEEK_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('DEEPSEEK_MAX_RETRIES', '2'), 10)
  };
}

// Mistral — Small 4 ($0.15/M in) unifies reasoning + multimodal + coding.
// Large 3 ($0.50/M in) is their flagship 675B MoE. Both are huge upgrades.
export const mistralModels = {
  small: 'mistral-small-latest',
  medium: 'mistral-large-latest',
  large: 'mistral-large-latest'
} as const;

export function getMistralConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MISTRAL_API_KEY'),
    endpoint: getEnv('MISTRAL_ENDPOINT', 'https://api.mistral.ai/v1/chat/completions'),
    model: getEnv('MISTRAL_MODEL', mistralModels.small),
    enabled: hasEnv('MISTRAL_API_KEY'),
    timeout: parseInt(getEnv('MISTRAL_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('MISTRAL_MAX_RETRIES', '2'), 10)
  };
}

// Moonshot/Kimi — K2.6 is the current model (1T MoE, 32B active, $0.95/M in).
// Old moonshot-v1-* models were discontinued May 2026.
export const moonshotModels = {
  small: 'kimi-k2.6',
  medium: 'kimi-k2.6',
  large: 'kimi-k2.6'
} as const;

export function getMoonshotConfig(): ProviderConfig {
  return {
    apiKey: getEnv('MOONSHOT_API_KEY'),
    endpoint: getEnv('MOONSHOT_ENDPOINT', 'https://api.moonshot.ai/v1/chat/completions'),
    model: getEnv('MOONSHOT_MODEL', moonshotModels.small),
    enabled: hasEnv('MOONSHOT_API_KEY'),
    timeout: parseInt(getEnv('MOONSHOT_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('MOONSHOT_MAX_RETRIES', '2'), 10)
  };
}

// Gemini — 2.5 Flash (cheap, generous free tier) for simple prompts.
// 3.5 Flash ($1.50/M in) for medium — near-Pro quality at Flash speed.
// 3.1 Pro for complex prompts — best Gemini for reasoning.
export const geminiModels = {
  small: 'gemini-2.5-flash',
  medium: 'gemini-3.5-flash',
  large: 'gemini-3.1-pro'
} as const;

export function getGeminiConfig(): ProviderConfig {
  return {
    apiKey: getEnv('GEMINI_API_KEY'),
    endpoint: getEnv('GEMINI_ENDPOINT', `https://generativelanguage.googleapis.com/v1beta/models/${geminiModels.small}:generateContent`),
    model: getEnv('GEMINI_MODEL', geminiModels.small),
    enabled: hasEnv('GEMINI_API_KEY'),
    timeout: parseInt(getEnv('GEMINI_TIMEOUT', '30000'), 10),
    maxRetries: parseInt(getEnv('GEMINI_MAX_RETRIES', '2'), 10)
  };
}

// Provider priority — ordered by quality-to-cost ratio for prompt enhancement.
// DeepSeek V4 Flash leads at $0.14/M with strong creative ability.
// Mistral Small 4 at $0.15/M is nearly as cheap with unified capabilities.
// Gemini 2.5 Flash has a generous free tier.
// Claude/OpenAI are higher quality but significantly more expensive.
export const providerPriority: ProviderSource[] = [
  'deepseek',  // V4 Flash: $0.14/M, strong creative
  'mistral',   // Small 4: $0.15/M, unified reasoning+creative
  'gemini',    // 2.5 Flash: generous free tier, good quality
  'claude',    // Haiku 4.5: excellent instruction-following
  'openai',    // GPT-5.4 Mini: $0.75/M, highest raw quality
  'moonshot',  // Kimi K2.6: $0.95/M, strong but pricier
  'local'      // Pattern-based fallback
];

export function getProviderConfig(provider: ProviderSource): ProviderConfig | null {
  switch (provider) {
    case 'claude': return getClaudeConfig();
    case 'openai': return getOpenAIConfig();
    case 'deepseek': return getDeepseekConfig();
    case 'mistral': return getMistralConfig();
    case 'moonshot': return getMoonshotConfig();
    case 'gemini': return getGeminiConfig();
    default: return null;
  }
}

export function hasExternalProvider(): boolean {
  return hasEnv('CLAUDE_API_KEY') || hasEnv('OPENAI_API_KEY') ||
    hasEnv('DEEPSEEK_API_KEY') || hasEnv('MISTRAL_API_KEY') ||
    hasEnv('MOONSHOT_API_KEY') || hasEnv('GEMINI_API_KEY');
}

export function getEnabledProviders(): ProviderSource[] {
  const enabled: ProviderSource[] = [];
  if (hasEnv('CLAUDE_API_KEY')) enabled.push('claude');
  if (hasEnv('OPENAI_API_KEY')) enabled.push('openai');
  if (hasEnv('DEEPSEEK_API_KEY')) enabled.push('deepseek');
  if (hasEnv('MISTRAL_API_KEY')) enabled.push('mistral');
  if (hasEnv('MOONSHOT_API_KEY')) enabled.push('moonshot');
  if (hasEnv('GEMINI_API_KEY')) enabled.push('gemini');
  enabled.push('local');
  return enabled;
}
