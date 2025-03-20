/**
 * LLM-based prompt enhancer that uses external APIs (DeepSeek/Mistral/Claude/Gemini)
 * This provides more advanced prompt enhancement than the rule-based approach
 */

const fetch = require('node-fetch');

// Environment variables should be loaded by dotenv in the main file
const USE_EXTERNAL_APIS = process.env.USE_EXTERNAL_APIS === 'true';

// LLM configurations
const LLM_CONFIGS = {
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    model: 'deepseek-chat',
    enabled: !!process.env.DEEPSEEK_API_KEY && USE_EXTERNAL_APIS
  },
  mistral: {
    apiKey: process.env.MISTRAL_API_KEY || '',
    endpoint: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-large-latest',
    enabled: !!process.env.MISTRAL_API_KEY && USE_EXTERNAL_APIS
  },
  claude: {
    apiKey: process.env.CLAUDE_API_KEY || '',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-opus-20240229',
    enabled: !!process.env.CLAUDE_API_KEY && USE_EXTERNAL_APIS
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    model: 'gemini-1.5-pro',
    enabled: !!process.env.GEMINI_API_KEY && USE_EXTERNAL_APIS
  }
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
function buildPromptEnhancementMessages(prompt, context, isRefinement = false) {
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
async function enhanceWithDeepseek(prompt, context, isRefinement = false) {
  const config = LLM_CONFIGS.deepseek;
  if (!config.enabled) {
    throw new Error('DeepSeek API not configured');
  }

  const startTime = Date.now();
  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
    console.log("Making DeepSeek API request");
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("DeepSeek API error details:", errorData);
      throw new Error(`DeepSeek API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'deepseek',
      metadata: {
        model: config.model,
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
async function enhanceWithMistral(prompt, context, isRefinement = false) {
  const config = LLM_CONFIGS.mistral;
  if (!config.enabled) {
    throw new Error('Mistral API not configured');
  }

  const startTime = Date.now();
  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
    console.log("Making Mistral API request");
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature: 0.2,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Mistral API error details:", errorData);
      throw new Error(`Mistral API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'mistral',
      metadata: {
        model: config.model,
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
async function enhanceWithClaude(prompt, context, isRefinement = false) {
  const config = LLM_CONFIGS.claude;
  if (!config.enabled) {
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
    
    console.log("Making Claude API request");
    
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        model: config.model,
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
    const enhancedPrompt = data.content[0].text;

    return {
      enhancedPrompt,
      source: 'claude',
      metadata: {
        model: config.model,
        usage: {
          input_tokens: data.usage?.input_tokens,
          output_tokens: data.usage?.output_tokens
        },
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
async function enhanceWithGemini(prompt, context, isRefinement = false) {
  const config = LLM_CONFIGS.gemini;
  if (!config.enabled) {
    throw new Error('Gemini API not configured');
  }

  const startTime = Date.now();
  try {
    let userPrompt = prompt;
    
    if (context) {
      userPrompt = `Original prompt: ${prompt}\nContext: ${context}`;
    }
    
    if (isRefinement) {
      userPrompt += "\nThis is already a refined prompt that needs further improvement.";
    }
    
    // Construct the full prompt with system message
    const fullPrompt = `${SYSTEM_MESSAGE}\n\n${userPrompt}`;
    
    console.log("Making Gemini API request");
    
    const queryParams = new URLSearchParams({
      key: config.apiKey
    }).toString();
    
    const response = await fetch(`${config.endpoint}?${queryParams}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: fullPrompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API error details:", errorData);
      throw new Error(`Gemini API error: ${JSON.stringify(errorData)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.candidates[0].content.parts[0].text;

    return {
      enhancedPrompt,
      source: 'gemini',
      metadata: {
        model: config.model,
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
 * Check which LLM APIs are available
 */
function getAvailableLLMs() {
  return Object.entries(LLM_CONFIGS)
    .filter(([name, config]) => config.enabled)
    .map(([name]) => name);
}

/**
 * Test connectivity to an LLM API with a minimal request
 */
async function testLLMConnection(llm) {
  if (!USE_EXTERNAL_APIS) {
    return { success: false, error: 'External APIs are disabled' };
  }
  
  const config = LLM_CONFIGS[llm];
  if (!config || !config.enabled) {
    return { success: false, error: 'LLM not configured or disabled' };
  }
  
  const startTime = Date.now();
  const testPrompt = "Hello, this is a test prompt.";
  
  try {
    // Make a minimal API call based on the provider
    let response;
    
    switch(llm) {
      case 'deepseek':
        response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 5
          })
        });
        break;
        
      case 'mistral':
        response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          body: JSON.stringify({
            model: config.model,
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 5
          })
        });
        break;
        
      case 'claude':
        response = await fetch(config.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'x-api-key': config.apiKey
          },
          body: JSON.stringify({
            model: config.model,
            system: "You are a helpful assistant.",
            messages: [{ role: "user", content: testPrompt }],
            max_tokens: 5
          })
        });
        break;
        
      case 'gemini':
        const queryParams = new URLSearchParams({
          key: config.apiKey
        }).toString();
        
        response = await fetch(`${config.endpoint}?${queryParams}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testPrompt }] }],
            generationConfig: {
              maxOutputTokens: 5
            }
          })
        });
        break;
        
      default:
        return { success: false, error: `Unknown LLM provider: ${llm}` };
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return { 
        success: false, 
        statusCode: response.status,
        error: `API returned ${response.status}`,
        details: errorData
      };
    }
    
    return { 
      success: true, 
      responseTime: Date.now() - startTime,
      statusCode: response.status
    };
  } catch (error) {
    return { 
      success: false, 
      error: error.message
    };
  }
}

/**
 * Main function to enhance a prompt using LLM APIs
 */
async function enhancePrompt(rawPrompt, context = "", isRefinement = false) {
  // First check if external APIs are enabled
  if (!USE_EXTERNAL_APIS) {
    console.log('External APIs are disabled, skipping LLM enhancement');
    return createDefaultResponse(rawPrompt, "external-apis-disabled");
  }

  // Get available LLMs in priority order
  const availableLLMs = getPrioritizedLLMs();
  
  if (availableLLMs.length === 0) {
    console.log('No LLMs are available or configured');
    return createDefaultResponse(rawPrompt, "no-llms-available");
  }
  
  console.log(`Attempting enhancement with ${availableLLMs.length} available LLMs: ${availableLLMs.join(', ')}`);
  
  // Track start time for total processing
  const startTime = Date.now();
  
  // Try each LLM in priority order until one succeeds
  let lastError = null;
  
  for (const llm of availableLLMs) {
    try {
      console.log(`Trying enhancement with ${llm}...`);
      let result;
      
      // Call the appropriate LLM enhancer
      switch (llm) {
        case 'claude':
          result = await enhanceWithClaude(rawPrompt, context, isRefinement);
          break;
        case 'gemini':
          result = await enhanceWithGemini(rawPrompt, context, isRefinement);
          break;
        case 'mistral':
          result = await enhanceWithMistral(rawPrompt, context, isRefinement);
          break;
        case 'deepseek':
          result = await enhanceWithDeepseek(rawPrompt, context, isRefinement);
          break;
        default:
          console.log(`Unknown LLM: ${llm}, skipping`);
          continue;
      }
      
      // Check if the LLM made meaningful changes
      const wasEnhanced = result.enhancedPrompt !== rawPrompt;
      
      if (!wasEnhanced) {
        console.log(`${llm} returned unchanged prompt, trying next LLM if available`);
        continue;
      }
      
      console.log(`Successfully enhanced prompt with ${llm}`);
      
      // Format the result to match the expected structure
      return {
        enhancedPrompt: result.enhancedPrompt,
        wasEnhanced: true,
        enhancements: [{
          type: 'llm.enhancement',
          description: `Enhanced using ${llm} model`
        }],
        metadata: {
          source: result.source,
          model: result.metadata.model,
          processingTime: result.metadata.processingTime || (Date.now() - startTime),
          success: true,
          usage: result.metadata.usage || {}
        }
      };
    } catch (error) {
      console.error(`Error enhancing prompt with ${llm}:`, error);
      lastError = error;
      // Continue to next LLM
    }
  }
  
  // If we get here, all LLMs failed
  console.error('All LLM enhancement attempts failed:', lastError);
  return createDefaultResponse(rawPrompt, "all-llms-failed", lastError?.message);
}

/**
 * Get configured LLMs in priority order (best first)
 */
function getPrioritizedLLMs() {
  // Define priority order (most capable/reliable first)
  const priorityOrder = ['claude', 'gemini', 'mistral', 'deepseek'];
  
  // Filter to only include enabled LLMs, maintaining priority order
  return priorityOrder.filter(llm => LLM_CONFIGS[llm].enabled);
}

/**
 * Helper to create a default response for when LLM enhancement fails
 */
function createDefaultResponse(prompt, reason = "unknown", errorMessage = null) {
  return {
    enhancedPrompt: prompt,
    wasEnhanced: false,
    enhancements: [],
    metadata: {
      source: reason,
      model: "none",
      processingTime: 0,
      success: false,
      error: errorMessage
    }
  };
}

module.exports = {
  enhancePrompt,
  getAvailableLLMs,
  testLLMConnection
}; 