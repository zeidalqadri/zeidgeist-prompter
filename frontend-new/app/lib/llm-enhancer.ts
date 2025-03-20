// LLM-based prompt enhancer that uses external APIs (DeepSeek/Mistral/Claude/Gemini)
// This provides immediate high-quality enhancements while helping train our own engine

import { trainingExamples } from './training-data';
import { enhancePrompt as localEnhance } from './prompt-enhancer-v2';

// Interface for API configuration
interface LLMConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
}

// Interface for enhancement response
export interface EnhancementResponse {
  enhancedPrompt: string;
  source: string;
  metadata: {
    model: string;
    usage?: any;
    success: boolean;
    processingTime?: number;
  };
}

// Store enhancement examples for training
async function storeEnhancementExample(
  rawPrompt: string,
  context: string,
  enhancedPrompt: string
) {
  // TODO: Implement storage to database
  console.log("Storing enhancement example for training");
}

// Default configuration - replace with actual API keys in production
const deepseekConfig: LLMConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat',
  enabled: !!process.env.DEEPSEEK_API_KEY
};

const mistralConfig: LLMConfig = {
  apiKey: process.env.MISTRAL_API_KEY || '',
  endpoint: 'https://api.mistral.ai/v1/chat/completions',
  model: 'mistral-large-latest',
  enabled: !!process.env.MISTRAL_API_KEY
};

// Add Claude configuration
const claudeConfig: LLMConfig = {
  apiKey: process.env.CLAUDE_API_KEY || '',
  endpoint: 'https://api.anthropic.com/v1/messages',
  model: 'claude-3-opus-20240229',
  enabled: !!process.env.CLAUDE_API_KEY
};

// Add Gemini configuration
const geminiConfig: LLMConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  model: 'gemini-1.5-pro',
  enabled: !!process.env.GEMINI_API_KEY
};

// Standard prompt engineering system message
const SYSTEM_MESSAGE = `You are a prompt engineering expert. Your task is to refine and enhance user prompts to make them more effective, detailed, and likely to produce high-quality outputs from AI systems.

When enhancing prompts:
1. Add specificity and detail where needed
2. Improve structure and organization
3. Add relevant context or constraints
4. Fix ambiguities and clarify intent
5. Add parameters for evaluating success
6. Maintain the original intent and core request

Do not:
1. Change the fundamental request or add unrelated elements
2. Make the prompt unnecessarily verbose
3. Include irrelevant details or constraints

EXTREMELY IMPORTANT: Your output must be the enhanced prompt ONLY, with NO explanations, introductions, or commentary. Do not include phrases like "Here's the enhanced prompt:" or "I've improved the prompt to:". Return ONLY the enhanced text.`;

// Create standard prompt enhancement messages
function buildPromptEnhancementMessages(prompt: string, context?: string, isRefinement: boolean = false) {
  const messages = [
    { role: "system", content: SYSTEM_MESSAGE }
  ];

  // Add context and refinement information
  let userMessage = prompt;
  if (context) {
    userMessage = `Original prompt: ${prompt}\nContext: ${context}`;
  }
  
  if (isRefinement) {
    userMessage += "\nThis is already a refined prompt that needs further improvement.";
  }
  
  messages.push({ role: "user", content: userMessage });
  
  return messages;
}

/**
 * Enhance a prompt using DeepSeek AI API
 */
async function enhanceWithDeepseek(
  prompt: string,
  context?: string,
  isRefinement: boolean = false,
  isExpansion: boolean = false,
  repeatCount: number = 0
): Promise<EnhancementResponse> {
  if (!deepseekConfig.enabled) {
    throw new Error('DeepSeek API not configured');
  }

  const startTime = Date.now();
  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
    console.log("Making DeepSeek API request with key:", 
                deepseekConfig.apiKey ? `${deepseekConfig.apiKey.substring(0, 5)}...` : 'MISSING KEY');
    
    const response = await fetch(deepseekConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepseekConfig.apiKey}`
      },
      body: JSON.stringify({
        model: deepseekConfig.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    // Handle error responses properly
    if (!response.ok) {
      const errorData = await response.json();
      console.error("DeepSeek API error details:", errorData);
      throw new Error(`DeepSeek API error: ${JSON.stringify(errorData)}`);
    }

    // Only parse JSON once
    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'deepseek',
      metadata: {
        model: deepseekConfig.model,
        usage: data.usage,
        success: true,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error calling DeepSeek API:', error);
    throw error;
  }
}

/**
 * Enhance a prompt using Mistral AI API
 */
async function enhanceWithMistral(
  prompt: string,
  context?: string,
  isRefinement: boolean = false,
  isExpansion: boolean = false,
  repeatCount: number = 0
): Promise<EnhancementResponse> {
  if (!mistralConfig.enabled) {
    throw new Error('Mistral API not configured');
  }

  const startTime = Date.now();
  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
    console.log("Making Mistral API request with key:", 
                mistralConfig.apiKey ? `${mistralConfig.apiKey.substring(0, 5)}...` : 'MISSING KEY');
    
    const response = await fetch(mistralConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mistralConfig.apiKey}`
      },
      body: JSON.stringify({
        model: mistralConfig.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    // Handle error responses properly
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Mistral API error details:", errorData);
      throw new Error(`Mistral API error: ${JSON.stringify(errorData)}`);
    }

    // Only parse JSON once
    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'mistral',
      metadata: {
        model: mistralConfig.model,
        usage: data.usage,
        success: true,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error calling Mistral API:', error);
    throw error;
  }
}

/**
 * Enhance a prompt using Claude API
 */
async function enhanceWithClaude(
  prompt: string,
  context?: string,
  isRefinement: boolean = false,
  isExpansion: boolean = false,
  repeatCount: number = 0
): Promise<EnhancementResponse> {
  if (!claudeConfig.enabled) {
    throw new Error('Claude API not configured');
  }

  const startTime = Date.now();
  try {
    // Claude has a different API structure
    const systemPrompt = SYSTEM_MESSAGE;
    let userPrompt = prompt;
    
    if (context) {
      userPrompt = `Original prompt: ${prompt}\nContext: ${context}`;
    }
    
    if (isRefinement) {
      userPrompt += "\nThis is already a refined prompt that needs further improvement.";
    }
    
    if (isExpansion) {
      userPrompt += "\nPlease expand on this prompt, adding more detail, specificity, and structure.";
    }
    
    // Modern Anthropic API format
    const response = await fetch(claudeConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeConfig.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: claudeConfig.model,
        system: systemPrompt,
        messages: [
          { role: "user", content: userPrompt }
        ],
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Claude API error details:", errorData);
      throw new Error(`Claude API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Claude API response structure:", Object.keys(data));
    
    // Extract content from Claude's response
    let enhancedPrompt = "";
    if (data.content && Array.isArray(data.content) && data.content.length > 0) {
      enhancedPrompt = data.content[0].text;
    } else if (data.completion) {
      // Fallback for older API versions
      enhancedPrompt = data.completion;
    } else {
      throw new Error("Unexpected Claude API response format");
    }

    // Clean up any markdown formatting or JSON if it accidentally used it
    enhancedPrompt = enhancedPrompt
      .replace(/```[a-z]*\n|\n```/g, '') // Remove code blocks
      .replace(/\n+/g, '\n') // Normalize newlines
      .trim();

    return {
      enhancedPrompt,
      source: 'claude',
      metadata: {
        model: claudeConfig.model,
        usage: data.usage || null,
        success: true,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error calling Claude API:', error);
    throw error;
  }
}

/**
 * Enhance a prompt using Gemini API
 */
async function enhanceWithGemini(
  prompt: string,
  context?: string,
  isRefinement: boolean = false,
  isExpansion: boolean = false,
  repeatCount: number = 0
): Promise<EnhancementResponse> {
  if (!geminiConfig.enabled) {
    throw new Error('Gemini API not configured');
  }

  const startTime = Date.now();
  try {
    // Gemini has a different API structure
    let userPrompt = `${SYSTEM_MESSAGE}\n\nOriginal prompt: ${prompt}`;
    
    if (context) {
      userPrompt += `\nContext: ${context}`;
    }
    
    if (isRefinement) {
      userPrompt += "\nThis is already a refined prompt that needs further improvement.";
    }
    
    if (isExpansion) {
      userPrompt += "\nPlease expand on this prompt, adding more detail, specificity, and structure.";
    }
    
    // Add a clear instruction at the end
    userPrompt += "\n\nYour task is to provide an enhanced version of this prompt. Return ONLY the enhanced prompt text, with no explanations, commentary, or additional text.";
    
    // Log the request for debugging
    console.log("Gemini request:", {
      endpoint: geminiConfig.endpoint,
      model: geminiConfig.model,
      promptLength: userPrompt.length
    });
    
    // Gemini API request
    const response = await fetch(`${geminiConfig.endpoint}?key=${geminiConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: userPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024,
          topP: 0.95,
          topK: 40
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    console.log("Gemini API response structure:", Object.keys(data));
    
    // Safely extract the response content
    let enhancedPrompt = "";
    if (data.candidates && Array.isArray(data.candidates) && data.candidates.length > 0) {
      if (data.candidates[0].content && 
          data.candidates[0].content.parts && 
          Array.isArray(data.candidates[0].content.parts) && 
          data.candidates[0].content.parts.length > 0) {
        enhancedPrompt = data.candidates[0].content.parts[0].text;
      }
    }
    
    if (!enhancedPrompt) {
      throw new Error("Unexpected Gemini API response format or empty response");
    }

    // Clean up any markdown formatting or JSON that might have been included
    enhancedPrompt = enhancedPrompt
      .replace(/```[a-z]*\n|\n```/g, '') // Remove code blocks
      .replace(/\n+/g, '\n') // Normalize newlines
      .trim();
      
    // Ensure we're not getting an explanation
    if (enhancedPrompt.toLowerCase().includes("here's an enhanced prompt") || 
        enhancedPrompt.toLowerCase().includes("enhanced version") ||
        enhancedPrompt.toLowerCase().includes("i've improved") ||
        enhancedPrompt.toLowerCase().startsWith("the enhanced prompt")) {
      // Extract the actual prompt from the explanation
      const lines = enhancedPrompt.split('\n');
      // Remove the first few lines if they look like explanations
      let startLine = 0;
      for (let i = 0; i < Math.min(3, lines.length); i++) {
        if (lines[i].toLowerCase().includes("enhanced") || 
            lines[i].toLowerCase().includes("improved") ||
            lines[i].toLowerCase().includes("here's")) {
          startLine = i + 1;
        }
      }
      enhancedPrompt = lines.slice(startLine).join('\n').trim();
    }

    return {
      enhancedPrompt,
      source: 'gemini',
      metadata: {
        model: geminiConfig.model,
        usage: null, // Gemini doesn't return usage data in the same way
        success: true,
        processingTime: Date.now() - startTime
      }
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Enhanced prompt generation using external APIs or local engine
 * with automatic fallback and random API selection
 */
export async function enhancePrompt(
  rawPrompt: string,
  context: string = "",
  isRefinement: boolean = false,
  isExpansion: boolean = false,
  repeatCount: number = 0
): Promise<{ enhancedPrompt: string, metadata?: { source: string, model?: string, processingTime?: number } }> {
  // Store metrics for this enhancement request
  const enhancementMetrics = {
    startTime: Date.now(),
    apiAttempts: 0,
    success: false,
    apiUsed: null as string | null,
    fallbackUsed: false
  };
  
  try {
    let result: EnhancementResponse | null = null;
    
    // Get available APIs
    const availableApis = [
      { name: 'claude', enabled: claudeConfig.enabled, handler: enhanceWithClaude },
      { name: 'gemini', enabled: geminiConfig.enabled, handler: enhanceWithGemini },
      { name: 'deepseek', enabled: deepseekConfig.enabled, handler: enhanceWithDeepseek },
      { name: 'mistral', enabled: mistralConfig.enabled, handler: enhanceWithMistral }
    ].filter(api => api.enabled);
    
    // If no APIs are available, use local enhancement immediately
    if (availableApis.length === 0) {
      console.log('No external APIs configured, using local enhancement');
      const localResult = await localEnhance(rawPrompt, context);
      return {
        enhancedPrompt: localResult,
        metadata: {
          source: 'local',
          processingTime: Date.now() - enhancementMetrics.startTime
        }
      };
    }
    
    console.log(`Found ${availableApis.length} available APIs: ${availableApis.map(a => a.name).join(', ')}`);
    
    // Shuffle the apis array to randomize the order
    const shuffledApis = [...availableApis].sort(() => Math.random() - 0.5);
    console.log(`Randomized API order: ${shuffledApis.map(a => a.name).join(', ')}`);
    
    // Try each API in randomized order
    for (const api of shuffledApis) {
      enhancementMetrics.apiAttempts++;
      
      try {
        console.log(`Attempting to enhance with ${api.name}...`);
        result = await api.handler(rawPrompt, context, isRefinement, isExpansion, repeatCount);
        
        // If we have a successful result and it's different from the input, use it
        if (result && result.enhancedPrompt && result.enhancedPrompt !== rawPrompt) {
          // Verify the output is substantial and not just a minor change
          const isSubstantialChange = 
            result.enhancedPrompt.length > rawPrompt.length * 1.1 ||  // 10% longer, or
            calculateTextDifference(rawPrompt, result.enhancedPrompt) > 0.3;  // 30% different
            
          if (!isSubstantialChange) {
            console.warn(`${api.name} returned non-substantial change, trying next API`);
            continue;
          }
          
          enhancementMetrics.success = true;
          enhancementMetrics.apiUsed = api.name;
          
          // Store this result for training our own engine
          storeEnhancementExample(rawPrompt, context, result.enhancedPrompt);
          
          // Log metrics
          console.log(`Enhancement metrics: ${JSON.stringify(enhancementMetrics)}`);
          
          return {
            enhancedPrompt: result.enhancedPrompt,
            metadata: {
              source: api.name,
              model: result.metadata.model,
              processingTime: result.metadata.processingTime
            }
          };
        } else {
          console.warn(`${api.name} returned identical or empty prompt, trying next API`);
        }
      } catch (error) {
        console.warn(`${api.name} API failed, trying next API:`, error);
      }
    }
    
    // If we've tried all APIs and none worked, use local enhancement
    console.warn('All external APIs failed or returned identical results, using local enhancement');
    enhancementMetrics.fallbackUsed = true;
    
    const localResult = await localEnhance(rawPrompt, context);
    
    // Log fallback metrics
    enhancementMetrics.success = true;
    enhancementMetrics.apiUsed = 'local';
    console.log(`Enhancement metrics (fallback): ${JSON.stringify(enhancementMetrics)}`);
    
    return {
      enhancedPrompt: localResult,
      metadata: {
        source: 'local-fallback',
        processingTime: Date.now() - enhancementMetrics.startTime
      }
    };
  } catch (error) {
    console.error('All enhancement methods failed:', error);
    
    // Log failure metrics
    enhancementMetrics.success = false;
    console.log(`Enhancement metrics (failed): ${JSON.stringify(enhancementMetrics)}`);
    
    // If everything fails, return the raw prompt with a minimal enhancement rather than just the raw prompt
    const minimalEnhancement = rawPrompt.length > 100 
      ? rawPrompt 
      : `${rawPrompt}. Be detailed, specific, and comprehensive in your response.`;
      
    return {
      enhancedPrompt: minimalEnhancement,
      metadata: {
        source: 'error-minimal',
        processingTime: Date.now() - enhancementMetrics.startTime
      }
    };
  }
}

/**
 * Calculate difference between two texts (0-1 scale)
 * Higher number means more different
 */
function calculateTextDifference(text1: string, text2: string): number {
  // Normalize texts
  const norm1 = text1.toLowerCase().trim();
  const norm2 = text2.toLowerCase().trim();
  
  // Simple case: identical texts
  if (norm1 === norm2) return 0;
  
  // Simple case: completely different length
  const lenDiff = Math.abs(norm1.length - norm2.length) / Math.max(norm1.length, norm2.length);
  if (lenDiff > 0.5) return 0.8; // Very different if length differs by >50%
  
  // Split into words for comparison
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  
  // Count shared words
  let sharedCount = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      sharedCount++;
    }
  }
  
  // Calculate Jaccard distance
  const union = words1.size + words2.size - sharedCount;
  const similarity = sharedCount / union;
  
  return 1 - similarity; // Convert similarity to difference
}

/**
 * Process user feedback on prompt enhancements to improve the system
 */
export async function processEnhancementFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedback?: string
): Promise<void> {
  try {
    console.log("Processing enhancement feedback:", {
      originalPrompt,
      enhancedPrompt,
      wasSuccessful,
      feedback
    });
    
    // Store the feedback example for learning
    // This will be expanded to include actual database storage and learning
    await storeEnhancementExample(originalPrompt, feedback || "", enhancedPrompt);
    
    // TODO: Implement more sophisticated feedback processing
    // 1. Store in database with success/failure flag
    // 2. Update model weights based on feedback
    // 3. Generate additional training examples
    
    return;
  } catch (error) {
    console.error("Error processing enhancement feedback:", error);
    throw error;
  }
} 