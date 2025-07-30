// Simplified LLM enhancer for Cloudflare Functions

interface EnhancementResponse {
  enhancedPrompt: string;
  source: 'deepseek' | 'mistral' | 'gemini' | 'local';
  metadata?: Record<string, unknown>;
}

// Simple local enhancement as fallback
function enhanceLocally(prompt: string, context?: string): EnhancementResponse {
  let enhanced = prompt;
  
  // Basic improvements
  if (!enhanced.endsWith('.') && !enhanced.endsWith('?') && !enhanced.endsWith('!')) {
    enhanced += '.';
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
async function enhanceWithDeepseek(prompt: string, context?: string, isRefinement: boolean = false): Promise<EnhancementResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
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
async function enhanceWithMistral(prompt: string, context?: string, isRefinement: boolean = false): Promise<EnhancementResponse> {
  const apiKey = process.env.MISTRAL_API_KEY;
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

// Main enhancement function with fallbacks
export async function enhancePrompt(
  prompt: string,
  context?: string,
  options: {
    isRefinement?: boolean;
    isExpansion?: boolean;
    repeatCount?: number;
  } = {}
): Promise<EnhancementResponse> {
  const { isRefinement = false } = options;

  // Try different providers in order
  const providers = [
    { name: 'deepseek', fn: enhanceWithDeepseek },
    { name: 'mistral', fn: enhanceWithMistral }
  ];

  for (const provider of providers) {
    try {
      console.log(`Trying enhancement with ${provider.name}...`);
      const result = await provider.fn(prompt, context, isRefinement);
      console.log(`Successfully enhanced with ${provider.name}`);
      return result;
    } catch (error) {
      console.warn(`${provider.name} enhancement failed:`, error);
      continue;
    }
  }

  // Fallback to local enhancement
  console.log('All external providers failed, using local enhancement');
  return enhanceLocally(prompt, context);
}