// Simplified LLM enhancer for Cloudflare Functions

interface EnhancementResponse {
  enhancedPrompt: string;
  source: 'claude' | 'openai' | 'deepseek' | 'mistral' | 'moonshot' | 'local';
  metadata?: Record<string, unknown>;
}

// Simple local enhancement as fallback
function enhanceLocally(prompt: string, context?: string, options: any = {}): EnhancementResponse {
  let enhanced = prompt;
  
  // Basic improvements
  if (!enhanced.endsWith('.') && !enhanced.endsWith('?') && !enhanced.endsWith('!')) {
    enhanced += '.';
  }
  
  // Add some basic enhancement based on options
  if (options.isRefinement) {
    enhanced = `Refined: ${enhanced}`;
  }
  
  if (options.isExpansion) {
    enhanced = `${enhanced} Please provide detailed analysis and comprehensive coverage of this topic.`;
  }
  
  // Add context if provided
  if (context && context.trim()) {
    enhanced = `Context: ${context}\n\nPrompt: ${enhanced}`;
  }
  
  return {
    enhancedPrompt: enhanced,
    source: 'local',
    metadata: { processingTime: 1 }
  };
}

// Build enhancement messages
function buildPromptEnhancementMessages(prompt: string, context?: string, isRefinement: boolean = false) {
  const systemPrompt = isRefinement 
    ? "You are an expert at refining and improving prompts. Take the given prompt and make it more clear, specific, and effective while preserving the original intent."
    : "You are an expert prompt engineer. Enhance the given prompt to be more specific, clear, and effective for getting better AI responses.";

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `Context: ${context}\n\nPrompt to enhance: ${prompt}`;
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

// DeepSeek enhancement
async function enhanceWithDeepseek(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error('DeepSeek API key not configured');
  }

  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DeepSeek API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: data.choices[0].message.content,
    source: 'deepseek',
    metadata: { model: 'deepseek-chat', usage: data.usage }
  };
}

// Mistral enhancement
async function enhanceWithMistral(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Mistral API key not configured');
  }

  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'mistral-large-latest',
      messages,
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: data.choices[0].message.content,
    source: 'mistral',
    metadata: { model: 'mistral-large-latest', usage: data.usage }
  };
}

// Claude enhancement (Anthropic)
async function enhanceWithClaude(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  const systemPrompt = isRefinement 
    ? "You are an expert at refining and improving prompts. Take the given prompt and make it more clear, specific, and effective while preserving the original intent."
    : "You are an expert prompt engineer. Enhance the given prompt to be more specific, clear, and effective for getting better AI responses.";

  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `Context: ${context}\n\nPrompt to enhance: ${prompt}`;
  }
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1024,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Claude API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: data.content[0].text,
    source: 'claude',
    metadata: { model: 'claude-3-haiku', usage: data.usage }
  };
}

// OpenAI enhancement
async function enhanceWithOpenAI(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages,
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: data.choices[0].message.content,
    source: 'openai',
    metadata: { model: 'gpt-4o-mini', usage: data.usage }
  };
}

// Moonshot enhancement (Kimi)
async function enhanceWithMoonshot(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('Moonshot API key not configured');
  }

  const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
  
  const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'moonshot-v1-8k',
      messages,
      temperature: 0.2,
      max_tokens: 1024
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Moonshot API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: data.choices[0].message.content,
    source: 'moonshot',
    metadata: { model: 'moonshot-v1-8k', usage: data.usage }
  };
}

// Shuffle array for random rotation
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Main enhancement function with random rotation
export async function enhancePrompt(
  prompt: string,
  context?: string,
  options: {
    isRefinement?: boolean;
    isExpansion?: boolean;
    repeatCount?: number;
    env?: Record<string, string>;
  } = {}
): Promise<EnhancementResponse> {
  const { isRefinement = false, env = {} } = options;

  // Check which API keys are configured
  const availableProviders = [];
  
  console.log('🔍 Checking API keys...');
  console.log('Available env keys:', Object.keys(env));
  console.log('Claude key:', !!env.CLAUDE_API_KEY);
  console.log('OpenAI key:', !!env.OPENAI_API_KEY);
  console.log('DeepSeek key:', !!env.DEEPSEEK_API_KEY);
  console.log('Mistral key:', !!env.MISTRAL_API_KEY);
  console.log('Moonshot key:', !!env.MOONSHOT_API_KEY);
  
  if (env.CLAUDE_API_KEY) {
    availableProviders.push({ name: 'claude', fn: (p: string, c?: string, r?: boolean) => enhanceWithClaude(p, c, r, env) });
  }
  if (env.OPENAI_API_KEY) {
    availableProviders.push({ name: 'openai', fn: (p: string, c?: string, r?: boolean) => enhanceWithOpenAI(p, c, r, env) });
  }
  if (env.DEEPSEEK_API_KEY) {
    availableProviders.push({ name: 'deepseek', fn: (p: string, c?: string, r?: boolean) => enhanceWithDeepseek(p, c, r, env) });
  }
  if (env.MISTRAL_API_KEY) {
    availableProviders.push({ name: 'mistral', fn: (p: string, c?: string, r?: boolean) => enhanceWithMistral(p, c, r, env) });
  }
  if (env.MOONSHOT_API_KEY) {
    availableProviders.push({ name: 'moonshot', fn: (p: string, c?: string, r?: boolean) => enhanceWithMoonshot(p, c, r, env) });
  }

  if (availableProviders.length === 0) {
    console.log('No API keys configured, using local enhancement');
    return {
      enhancedPrompt: prompt + '. (No API keys found - using local enhancement)',
      source: 'local',
      metadata: { 
        debugInfo: 'No API keys configured',
        availableEnvKeys: Object.keys(env),
        keysChecked: {
          claude: !!env.CLAUDE_API_KEY,
          openai: !!env.OPENAI_API_KEY,
          deepseek: !!env.DEEPSEEK_API_KEY,
          mistral: !!env.MISTRAL_API_KEY,
          moonshot: !!env.MOONSHOT_API_KEY
        }
      }
    };
  }

  // Randomly shuffle providers for load balancing and diversity
  const shuffledProviders = shuffleArray(availableProviders);
  console.log(`Available providers: ${shuffledProviders.map(p => p.name).join(', ')}`);

  // Try providers in random order
  for (const provider of shuffledProviders) {
    try {
      console.log(`🚀 Trying enhancement with ${provider.name}...`);
      const result = await provider.fn(prompt, context, isRefinement);
      console.log(`✅ Successfully enhanced with ${provider.name}`);
      return result;
    } catch (error) {
      console.error(`❌ ${provider.name} enhancement failed:`, {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      continue;
    }
  }

  // Fallback to local enhancement if all providers fail
  console.log('🔄 All external providers failed, using local enhancement');
  return enhanceLocally(prompt, context, options);
}