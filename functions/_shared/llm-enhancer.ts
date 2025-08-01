// Optimized LLM enhancer for Cloudflare Functions with sophisticated analysis

interface EnhancementResponse {
  enhancedPrompt: string;
  source: 'claude' | 'openai' | 'deepseek' | 'mistral' | 'moonshot' | 'local';
  metadata?: Record<string, unknown>;
}

interface EnhancementOptions {
  isRefinement?: boolean;
  isExpansion?: boolean;
  repeatCount?: number;
  env?: Record<string, string>;
}

// Sophisticated analysis functions ported from client-side enhancer

// Function to check if a prompt is already refined
function isAlreadyRefined(prompt: string): boolean {
  // Enhanced refinement detection with multiple criteria
  if (prompt.length < 100) {
    return false; // Short prompts are likely not refined
  }
  
  // Structure indicators - refined prompts have clear organization
  const hasNumberedList = /\d+\.\s/.test(prompt);
  const hasBulletPoints = /[•\-\*]\s/.test(prompt);
  const hasColonSeparation = prompt.includes(':') && prompt.includes(',');
  const hasMultipleSentences = (prompt.match(/\.\s/g) || []).length >= 3;
  
  // Specificity indicators - refined prompts contain detailed instructions
  const specificityKeywords = [
    'include', 'ensure', 'incorporate', 'consider', 'address', 'provide',
    'comprehensive', 'detailed', 'specific', 'professional', 'clear',
    'sections', 'requirements', 'guidelines', 'specifications', 'criteria'
  ];
  
  const specificityScore = specificityKeywords.reduce((score, keyword) => {
    return score + (prompt.toLowerCase().includes(keyword) ? 1 : 0);
  }, 0);
  
  // Domain-specific refinement indicators
  const hasInstructionalLanguage = /\b(should|must|need to|required|essential)\b/i.test(prompt);
  const hasActionableItems = /\b(create|design|develop|implement|establish|organize)\b/i.test(prompt);
  
  // Quality indicators - refined prompts often have these characteristics
  const hasContextSetup = prompt.toLowerCase().includes('context') || 
                         prompt.toLowerCase().includes('background') ||
                         prompt.toLowerCase().includes('considering');
  
  // Calculate refinement confidence score
  let refinementScore = 0;
  
  // Structure scoring
  if (hasNumberedList) refinementScore += 3;
  if (hasBulletPoints) refinementScore += 2;
  if (hasColonSeparation) refinementScore += 2;
  if (hasMultipleSentences) refinementScore += 2;
  
  // Specificity scoring
  refinementScore += Math.min(specificityScore, 4); // Cap at 4 points
  
  // Language quality scoring
  if (hasInstructionalLanguage) refinementScore += 2;
  if (hasActionableItems) refinementScore += 1;
  if (hasContextSetup) refinementScore += 1;
  
  // Length bonus for very detailed prompts
  if (prompt.length > 300) refinementScore += 2;
  if (prompt.length > 500) refinementScore += 1;
  
  // Threshold for considering a prompt "already refined"
  const isRefined = refinementScore >= 8;
  
  return isRefined;
}

// Minimal enhancement for already-refined prompts
function minimalEnhance(prompt: string, context?: string): string {
  let enhanced = prompt;
  
  // Fix punctuation and formatting issues
  enhanced = enhanced.replace(/\s+/g, ' ').trim();
  enhanced = enhanced.replace(/\.\s*,/g, '.');
  enhanced = enhanced.replace(/,,/g, ',');
  enhanced = enhanced.replace(/\.\./g, '.');
  
  // Ensure it ends with proper punctuation
  if (!enhanced.endsWith('.') && !enhanced.endsWith('!') && !enhanced.endsWith('?')) {
    enhanced += '.';
  }
  
  // Add context if relevant and not already included
  if (context && !prompt.toLowerCase().includes(context.toLowerCase())) {
    // Check if the context should be added
    if (context.length < prompt.length / 2) {
      // Find a natural place to insert the context
      const insertPoint = enhanced.indexOf(', ') + 2;
      if (insertPoint > 2) {
        enhanced = enhanced.slice(0, insertPoint) + 
                  'considering ' + context + ', ' + 
                  enhanced.slice(insertPoint);
      }
    }
  }
  
  return enhanced;
}

// Domain-specific enhancement
function enhanceByDomain(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract the core subject after "for" if it exists
  let subject = prompt;
  if (prompt.includes(' for ')) {
    subject = prompt.split(' for ')[1].trim();
  } else if (prompt.includes('website')) {
    subject = prompt.replace('website', '').trim();
  }
  
  // Website domain with profession detection
  if (lowerPrompt.includes('website') || lowerPrompt.includes('webpage') || lowerPrompt.includes('site')) {
    // Academic/Professor profiles
    if (lowerPrompt.includes('professor') || lowerPrompt.includes('academic') || 
        lowerPrompt.includes('university') || lowerPrompt.includes('faculty') ||
        lowerPrompt.includes('lecturer') || lowerPrompt.includes('researcher')) {
      
      // Detect if it's also a healthcare professional
      let academicHealthcareContent = "";
      if (lowerPrompt.includes('doctor') || lowerPrompt.includes('dentist') || 
          lowerPrompt.includes('orthodontist') || lowerPrompt.includes('medical')) {
        academicHealthcareContent = "\n9. Patient care services and clinic information\n10. Integration between clinical practice and academic research";
      }
      
      return `Design a professional website for ${subject}. Include sections for:
1. Academic biography and research interests
2. Publications and scholarly works with downloadable papers
3. Courses taught and teaching philosophy
4. Research projects and laboratory information
5. Student resources and mentorship opportunities
6. CV/resume with academic appointments and honors
7. Conference presentations and upcoming speaking engagements
8. Contact information and office hours${academicHealthcareContent}`;
    }
    
    // Medical/Healthcare professionals
    if (lowerPrompt.includes('doctor') || lowerPrompt.includes('physician') || 
        lowerPrompt.includes('dentist') || lowerPrompt.includes('orthodontist') ||
        lowerPrompt.includes('clinic') || lowerPrompt.includes('medical') ||
        lowerPrompt.includes('healthcare')) {
      return `Design a professional website for ${subject}. Include sections for:
1. Services and treatments offered with detailed descriptions
2. Professional credentials, education, and certifications
3. Patient testimonials and success stories
4. Before-and-after galleries (where appropriate)
5. Insurance information and payment options
6. Easy-to-use appointment scheduling system
7. Resource library for patient education
8. Contact information and office location/hours`;
    }
    
    if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('cafe') || lowerPrompt.includes('bakery')) {
      return `Design an appealing website for ${subject}.` +
             ' Include sections for menu, location information, opening hours, photo gallery of food and ambiance, ' +
             'customer reviews, and an online reservation system.';
    }
    
    return `Design a professional website for ${subject}.` +
           ' Include sections for services, about us information, contact details, testimonials/reviews, and a ' +
           'clean modern design that reflects the brand identity.';
  }
  
  // Writing domain
  if (lowerPrompt.includes('write') || lowerPrompt.includes('essay') || lowerPrompt.includes('article')) {
    return `${prompt} with a clear structure including introduction, main points with supporting evidence, and a strong conclusion. ` +
           'Ensure the content is well-researched, engaging, and tailored to the target audience.';
  }
  
  // Default - return empty to let the caller add generic enhancements
  return '';
}

// Enhanced local enhancement with intelligent analysis
function enhanceLocally(prompt: string, context?: string, options: EnhancementOptions = { env: {} }): EnhancementResponse {
  const startTime = Date.now();
  
  // Check if prompt is already refined
  if (!options.isRefinement && isAlreadyRefined(prompt)) {
    console.log('Prompt appears already refined, applying minimal enhancement');
    const enhanced = minimalEnhance(prompt, context);
    return {
      enhancedPrompt: enhanced,
      source: 'local',
      metadata: { 
        processingTime: Date.now() - startTime,
        enhancementType: 'minimal',
        alreadyRefined: true
      }
    };
  }
  
  // Try domain-specific enhancement first
  const domainEnhanced = enhanceByDomain(prompt);
  if (domainEnhanced) {
    let enhanced = domainEnhanced;
    
    // Add context if provided
    if (context && context.trim()) {
      enhanced = `Context: ${context}\n\nPrompt: ${enhanced}`;
    }
    
    return {
      enhancedPrompt: enhanced,
      source: 'local',
      metadata: { 
        processingTime: Date.now() - startTime,
        enhancementType: 'domain-specific'
      }
    };
  }
  
  // Generic enhancement fallback
  let enhanced = prompt;
  
  // Basic improvements
  if (!enhanced.endsWith('.') && !enhanced.endsWith('?') && !enhanced.endsWith('!')) {
    enhanced += '.';
  }
  
  // Add expansion if requested
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
    metadata: { 
      processingTime: Date.now() - startTime,
      enhancementType: 'generic'
    }
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
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      });
      continue;
    }
  }

  // Fallback to local enhancement if all providers fail
  console.log('🔄 All external providers failed, using local enhancement');
  return enhanceLocally(prompt, context, { ...options, env: options.env || {} });
}