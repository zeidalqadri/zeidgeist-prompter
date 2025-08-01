// LLM-based prompt enhancer that uses external APIs (DeepSeek/Mistral)
// This provides immediate high-quality enhancements while helping train our own engine

import { trainingExamples } from './training-data';
import { enhancePrompt as localEnhance } from './prompt-enhancer-v2';
import { db } from '@/lib/db/drizzle';
import { enhancementLogs, feedback } from '@/lib/db/schema';
import { AdaptiveEnhancer } from './learning/adaptive-enhancer';
import { LearningService } from './learning/learning-service';
import { eq, desc } from 'drizzle-orm';

// Interface for API configuration
interface LLMConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  enabled: boolean;
}


// Interface for prompt enhancement response
interface EnhancementResponse {
  enhancedPrompt: string;
  source: 'deepseek' | 'mistral' | 'gemini' | 'local';
  metadata?: Record<string, unknown>;
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

// Add Gemini configuration
const geminiConfig: LLMConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  model: 'gemini-1.5-pro',
  enabled: !!process.env.GEMINI_API_KEY
};

/**
 * Enhance a prompt using DeepSeek AI API
 */
async function enhanceWithDeepseek(
  prompt: string,
  context?: string,
  isRefinement: boolean = false
): Promise<EnhancementResponse> {
  if (!deepseekConfig.enabled) {
    throw new Error('DeepSeek API is not configured');
  }

  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`DeepSeek API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'deepseek',
      metadata: {
        model: deepseekConfig.model,
        usage: data.usage
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
  isRefinement: boolean = false
): Promise<EnhancementResponse> {
  if (!mistralConfig.enabled) {
    throw new Error('Mistral API is not configured');
  }

  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Mistral API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.choices[0].message.content;

    return {
      enhancedPrompt,
      source: 'mistral',
      metadata: {
        model: mistralConfig.model,
        usage: data.usage
      }
    };
  } catch (error) {
    console.error('Error calling Mistral API:', error);
    throw error;
  }
}

/**
 * Enhance a prompt using Gemini API
 */
async function enhanceWithGemini(
  prompt: string,
  context?: string,
  isRefinement: boolean = false
): Promise<EnhancementResponse> {
  if (!geminiConfig.enabled) {
    throw new Error('Gemini API is not configured');
  }

  try {
    const messages = buildPromptEnhancementMessages(prompt, context, isRefinement);
    
    // Convert to Gemini format - system prompt goes in a special parameter
    const systemPrompt = messages[0].content;
    
    // Extract examples and user message
    const examples = [];
    let userMessage = '';
    
    for (let i = 1; i < messages.length; i += 2) {
      if (i + 1 < messages.length) {
        examples.push({
          input: { text: messages[i].content },
          output: { text: messages[i+1].content }
        });
      } else {
        userMessage = messages[i].content;
      }
    }
    
    const response = await fetch(`${geminiConfig.endpoint}?key=${geminiConfig.apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: userMessage }]
          }
        ],
        systemInstruction: { text: systemPrompt },
        safetySettings: [
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_ONLY_HIGH"
          }
        ],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1024
        }
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    const enhancedPrompt = data.candidates[0].content.parts[0].text;

    return {
      enhancedPrompt,
      source: 'gemini',
      metadata: {
        model: geminiConfig.model
      }
    };
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Build the messages array for prompt enhancement
 */
function buildPromptEnhancementMessages(
  prompt: string,
  context?: string,
  isRefinement: boolean = false
): Array<{ role: string, content: string }> {
  const baseSystemPrompt = `You are an expert prompt engineer that enhances prompts to make them clearer and more effective. 
Your task is to refine the given prompt to provide better instructions and context.

Follow these guidelines:
1. Identify the core purpose and domain of the prompt
2. Add specific details and clarity without changing the original intent
3. Remove redundancies and improve organization
4. Add relevant specifications for structure or format if appropriate
5. DO NOT add "You are..." or role descriptions unless specifically needed
6. The output should be ONLY the enhanced prompt text, nothing else
7. NEVER include phrases like "Here's the refined prompt:" or explanations
8. Keep your response concise and focused on improving the prompt content only
9. If the prompt appears to be already enhanced, BUILD UPON IT - add detail, clarity, or structure
10. Each refinement should be better than the previous one, never just repeat the input

Examples of good enhancements:
- "website for a doctor" → "Design a professional website for a medical practitioner. Include sections for services, patient resources, credentials, and appointment scheduling."
- "write about climate change" → "Write a comprehensive analysis of climate change, covering its causes, current impacts, future projections, and potential solutions. Include supporting data and scientific consensus."`;

  // Add extra instructions for refinement iterations
  const refinementAddition = isRefinement ? `

IMPORTANT: This is an iterative refinement. The prompt has already been refined once.
You MUST:
1. Build upon the previous refinement, don't repeat it
2. Add more specific details, examples, or structure
3. Consider additional aspects the previous refinement didn't address
4. Assume the input prompt is already good but can be made even better
5. Elaborate on key points with more detailed or specific instructions
6. Add relevant constraints, requirements, or context that weren't in the previous refinement
7. NEVER just rewrite the existing format with minor changes
8. Make SUBSTANTIAL improvements that noticeably enhance the prompt quality
9. DO NOT return the same prompt text - your refinement MUST be different and better` : '';

  const systemPrompt = baseSystemPrompt + refinementAddition;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  // Add example demonstrations from our training data
  const examples = trainingExamples.slice(0, 3);
  for (const example of examples) {
    messages.push({ 
      role: "user", 
      content: example.context 
        ? `Prompt: ${example.rawPrompt}\nContext: ${example.context}`
        : `Prompt: ${example.rawPrompt}`
    });
    messages.push({ role: "assistant", content: example.enhancedPrompt });
  }

  // Add the actual prompt to enhance
  const userMessage = context
    ? `Prompt: ${prompt}\nContext: ${context}`
    : `Prompt: ${prompt}`;
  
  messages.push({ role: "user", content: userMessage });

  return messages;
}

/**
 * Enhanced prompt generation using either external APIs or local engine
 */
export async function enhancePrompt(
  rawPrompt: string,
  context: string = "",
  isRefinement: boolean = false
): Promise<string> {
  try {
    // Validate the input format - more permissive now
    if (rawPrompt === undefined || rawPrompt === null) {
      console.warn('Empty prompt received, returning empty string');
      return '';
    }
    
    // Convert any input to string to ensure it works
    const promptString = String(rawPrompt).trim();
    const contextString = context ? String(context).trim() : "";
    
    // Don't proceed with enhancement if the prompt is empty
    if (!promptString) {
      return '';
    }
    
    // Try adaptive enhancer first (uses learned patterns)
    const adaptiveEnhancer = new AdaptiveEnhancer();
    const adaptiveResult = await adaptiveEnhancer.enhance(promptString);
    
    if (adaptiveResult.source === 'learned' && adaptiveResult.confidence >= 0.8) {
      console.log('Using learned pattern enhancement with high confidence:', adaptiveResult.confidence);
      // Store this as a successful local enhancement
      await storeEnhancementExample(promptString, contextString, adaptiveResult.enhanced, 'local');
      return adaptiveResult.enhanced;
    } else if (adaptiveResult.source === 'hybrid' && adaptiveResult.confidence >= 0.6) {
      console.log('Using hybrid enhancement with moderate confidence:', adaptiveResult.confidence);
      return adaptiveResult.enhanced;
    }
    
    // Check if this is already a refined prompt (to prevent re-refinement issues)
    // Skip this check if isRefinement is true - we always want to enhance on repeat
    if (!isRefinement && isAlreadyRefined(promptString)) {
      console.log('Prompt appears to be already refined, applying minimal enhancements');
      // Apply only minimal formatting improvements for already refined prompts
      // But still make SOME changes so it's not identical
      const minimallyEnhanced = minimalEnhance(promptString, contextString);
      if (minimallyEnhanced === promptString) {
        // If even minimal enhancement returned the same prompt, add something generic
        return `${promptString}. Include comprehensive information and well-organized sections.`;
      }
      return minimallyEnhanced;
    }
    
    let result: EnhancementResponse;
    
    // Try DeepSeek API first if configured
    if (deepseekConfig.enabled) {
      try {
        result = await enhanceWithDeepseek(promptString, contextString, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('DeepSeek returned identical prompt');
        }
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, contextString, result.enhancedPrompt, 'deepseek');
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('DeepSeek API failed, falling back to Mistral:', error);
      }
    }
    
    // Try Mistral API if DeepSeek fails or is not configured
    if (mistralConfig.enabled) {
      try {
        result = await enhanceWithMistral(promptString, contextString, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('Mistral returned identical prompt');
        }
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, contextString, result.enhancedPrompt, 'mistral');
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('Mistral API failed, falling back to Gemini:', error);
      }
    }
    
    // Try Gemini API if both DeepSeek and Mistral fail
    if (geminiConfig.enabled) {
      try {
        result = await enhanceWithGemini(promptString, contextString, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('Gemini returned identical prompt');
        }
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, contextString, result.enhancedPrompt, 'gemini');
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('Gemini API failed, falling back to local engine:', error);
      }
    }
    
    // Fall back to local enhancement engine if all APIs fail or aren't configured
    const localResult = await localEnhance(promptString, contextString);
    
    // Final check - if even local enhancement returned the original, add something
    if (localResult === promptString) {
      // Try our improved domain-specific enhancement
      const domainEnhanced = enhanceByDomain(promptString);
      if (domainEnhanced !== promptString) {
        return domainEnhanced;
      }
      
      // Absolute fallback - add generic enhancements based on input pattern
      return generateGenericEnhancement(promptString);
    }
    
    return localResult;
  } catch (error) {
    console.error('All enhancement methods failed:', error);
    // Use improved generic enhancement as last resort
    return generateGenericEnhancement(String(rawPrompt).trim());
  }
}

/**
 * Generate generic enhancement based on input patterns
 * This ensures we always return something different from the input
 */
function generateGenericEnhancement(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Extract the main subject
  let subject = prompt;
  if (prompt.includes(' for ')) {
    subject = prompt.split(' for ')[1].trim();
  }
  
  // Website content
  if (lowerPrompt.includes('website') || lowerPrompt.includes('webpage') || lowerPrompt.includes('site')) {
    return `Design a professional website for ${subject}. Include sections for:
1. Services or products offered
2. About information with background and credentials
3. Portfolio or examples of work/achievements
4. Testimonials or reviews from clients/users
5. Contact information and user-friendly interface
6. FAQs or resources relevant to the field`;
  }
  
  // Writing content
  if (lowerPrompt.includes('write') || lowerPrompt.includes('essay') || lowerPrompt.includes('article') || 
      lowerPrompt.includes('blog') || lowerPrompt.includes('post')) {
    return `${prompt} with the following structure:
1. Engaging introduction that captures attention
2. Clear thesis or main argument
3. Well-organized body with supporting evidence and examples
4. Logical flow between paragraphs and sections
5. Compelling conclusion summarizing key points
6. Appropriate tone and style for the target audience`;
  }
  
  // Design content
  if (lowerPrompt.includes('design') || lowerPrompt.includes('create') || lowerPrompt.includes('develop')) {
    return `${prompt} with attention to:
1. Clear purpose and target audience
2. Professional aesthetics and visual hierarchy
3. Intuitive navigation and user experience
4. Consistent branding and style elements
5. Mobile responsiveness and accessibility
6. Measurable outcomes or success criteria`;
  }
  
  // Default enhancement for any other content
  return `${prompt}. Ensure it includes:
1. Comprehensive and well-researched content
2. Clear organization and logical structure
3. Professional presentation and formatting
4. Specific details rather than generalities
5. Appropriate context and background information
6. Actionable conclusions or next steps`;
}

/**
 * Domain-specific enhancement with more comprehensive templates
 */
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

// Function to check if a prompt is already refined
function isAlreadyRefined(prompt: string): boolean {
  // Enhanced refinement detection with multiple criteria
  
  // 1. Length check - refined prompts tend to be comprehensive
  if (prompt.length < 100) {
    return false; // Short prompts are likely not refined
  }
  
  // 2. Structure indicators - refined prompts have clear organization
  const hasNumberedList = /\d+\.\s/.test(prompt);
  const hasBulletPoints = /[•\-\*]\s/.test(prompt);
  const hasColonSeparation = prompt.includes(':') && prompt.includes(',');
  const hasMultipleSentences = (prompt.match(/\.\s/g) || []).length >= 3;
  
  // 3. Specificity indicators - refined prompts contain detailed instructions
  const specificityKeywords = [
    'include', 'ensure', 'incorporate', 'consider', 'address', 'provide',
    'comprehensive', 'detailed', 'specific', 'professional', 'clear',
    'sections', 'requirements', 'guidelines', 'specifications', 'criteria'
  ];
  
  const specificityScore = specificityKeywords.reduce((score, keyword) => {
    return score + (prompt.toLowerCase().includes(keyword) ? 1 : 0);
  }, 0);
  
  // 4. Domain-specific refinement indicators
  const hasInstructionalLanguage = /\b(should|must|need to|required|essential)\b/i.test(prompt);
  const hasActionableItems = /\b(create|design|develop|implement|establish|organize)\b/i.test(prompt);
  
  // 5. Quality indicators - refined prompts often have these characteristics
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
  // Score of 8+ indicates a well-structured, detailed prompt
  const isRefined = refinementScore >= 8;
  
  // Log for debugging/monitoring
  if (isRefined) {
    console.log(`Prompt appears refined (score: ${refinementScore}):`, {
      length: prompt.length,
      hasStructure: hasNumberedList || hasBulletPoints || hasColonSeparation,
      specificityScore,
      hasInstructionalLanguage,
      hasActionableItems
    });
  }
  
  return isRefined;
}

// Minimal enhancement for already-refined prompts
function minimalEnhance(prompt: string, context: string): string {
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

// Cache for storing enhancement examples from external APIs
const enhancementExamples: Array<{
  rawPrompt: string;
  context?: string;
  enhancedPrompt: string;
  timestamp: Date;
}> = [];

/**
 * Store enhancement examples from external APIs for training
 */
async function storeEnhancementExample(
  rawPrompt: string,
  context: string | undefined,
  enhancedPrompt: string,
  source: string = 'external'
): Promise<void> {
  try {
    // Store in database
    await db.insert(enhancementLogs).values({
      originalPrompt: rawPrompt,
      enhancedPrompt: enhancedPrompt,
      source: source,
      enhancementModel: source,
      responseTime: 0, // Will be updated by the caller
      context: JSON.stringify({ context }),
      createdAt: new Date(),
    });

    // Also store in memory for immediate access
    enhancementExamples.push({
      rawPrompt,
      context,
      enhancedPrompt,
      timestamp: new Date()
    });
    
    // Trigger learning cycle if we have enough examples
    if (enhancementExamples.length >= 50) {
      console.log(`Collected ${enhancementExamples.length} enhancement examples, triggering learning cycle`);
      const learningService = new LearningService();
      learningService.runLearningCycle().catch(console.error);
      // Clear memory after learning
      enhancementExamples.length = 0;
    }
  } catch (error) {
    console.error('Error storing enhancement example:', error);
  }
}

/**
 * Feedback processing for continuous improvement
 */
export async function processEnhancementFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedbackText?: string,
  score: number = wasSuccessful ? 5 : 1
): Promise<void> {
  try {
    // Find the enhancement log entry
    const logs = await db
      .select()
      .from(enhancementLogs)
      .where(eq(enhancementLogs.originalPrompt, originalPrompt))
      .orderBy(desc(enhancementLogs.createdAt))
      .limit(1);

    if (logs.length > 0) {
      // Store feedback in database
      await db.insert(feedback).values({
        enhancementId: logs[0].id,
        successful: wasSuccessful,
        score: score,
        comment: feedbackText,
        createdAt: new Date(),
      });

      // If positive feedback, trigger immediate pattern extraction
      if (wasSuccessful && score >= 4) {
        const learningService = new LearningService();
        // Extract pattern from this specific enhancement
        await learningService.runLearningCycle();
      }
    }
    
    console.log('Enhancement feedback stored:', {
      originalPrompt,
      wasSuccessful,
      score,
      feedback: feedbackText
    });
  } catch (error) {
    console.error('Error processing enhancement feedback:', error);
  }
} 