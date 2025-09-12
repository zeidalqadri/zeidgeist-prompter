// LLM-based prompt enhancer that uses external APIs (DeepSeek/Mistral)
// This provides immediate high-quality enhancements while helping train our own engine

import { trainingExamples } from './training-data';
import { enhancePrompt as localEnhance } from './prompt-enhancer-v2';
import { db, enhancementLogs, feedback } from './db';
import { AdaptiveEnhancer } from './learning/adaptive-enhancer';
import { LearningService } from './learning/learning-service';
import { AdvancedContextManager } from './enhanced-architecture/context-manager';
import { SafetyValidator } from './enhanced-architecture/safety-validator';
import { MetricsCalculator } from './enhanced-architecture/metrics-calculator';
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

// Add Gemini configuration with optimized defaults
const geminiConfig: LLMConfig = {
  apiKey: process.env.GEMINI_API_KEY || '',
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
  model: 'gemini-1.5-pro', // Will be dynamically selected based on task
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
 * Build Mistral-specific enhancement messages optimized for Mistral's capabilities
 */
function buildMistralPromptEnhancementMessages(
  prompt: string,
  context?: string,
  isRefinement: boolean = false
): Array<{ role: string, content: string }> {
  // Mistral-optimized system prompt using their documented best practices
  const systemPrompt = isRefinement 
    ? `### PROMPT REFINEMENT SPECIALIST ###

<<<ROLE>>>
You are an elite prompt refinement expert specializing in iterative improvement of existing prompts. Your expertise lies in identifying gaps and enhancing clarity while preserving original intent.
<<<END_ROLE>>>

<<<TASK_INSTRUCTIONS>>>
Your task is to refine an already-enhanced prompt by:

**Step 1: ANALYSIS**
- Identify remaining ambiguities or gaps
- Assess completeness of specifications
- Evaluate clarity of success criteria

**Step 2: ENHANCEMENT STRATEGY**
- Add missing edge case handling
- Strengthen specificity without redundancy
- Improve structural organization
- Enhance actionability

**Step 3: REFINEMENT EXECUTION**
- Build upon existing quality (don't restart)
- Add substantial improvements (not minor changes)
- Include concrete examples where helpful
- Ensure measurable success criteria

**Step 4: VALIDATION**
- Verify all constraints are addressed
- Confirm enhanced specificity
- Ensure actionable outcomes
<<<END_TASK_INSTRUCTIONS>>>

<<<OUTPUT_CONSTRAINTS>>>
- OUTPUT FORMAT: Enhanced prompt text only
- NO META-TEXT: Never include "Here's...", "This is...", "Below is..."
- NO EXPLANATIONS: Just the refined prompt
- SUBSTANTIAL CHANGES: Must be meaningfully different from input
- DIRECT DELIVERY: Start immediately with the enhanced content
<<<END_OUTPUT_CONSTRAINTS>>>

<<<QUALITY_CHECKLIST>>>
☐ Eliminates remaining ambiguity
☐ Adds concrete specifications  
☐ Includes success/failure criteria
☐ Provides actionable steps
☐ Contains relevant examples
☐ Maintains original intent
☐ Significantly improves upon input
<<<END_QUALITY_CHECKLIST>>>`

    : `### PROMPT ENHANCEMENT SPECIALIST ###

<<<ROLE>>>
You are an elite prompt engineering expert with deep expertise in transforming vague requests into crystal-clear, actionable prompts that deliver exceptional results.
<<<END_ROLE>>>

<<<TASK_METHODOLOGY>>>
Follow this systematic approach:

**Step 1: INTENT EXTRACTION**
- Identify core purpose and domain
- Determine target audience and use case
- Extract key requirements and constraints

**Step 2: GAP ANALYSIS**
- What specific information is missing?
- What ambiguities need clarification?
- What edge cases should be addressed?

**Step 3: ENHANCEMENT DESIGN**
- Structure with clear sections and hierarchy
- Add domain-specific requirements
- Include success criteria and quality standards
- Specify desired format and style

**Step 4: OPTIMIZATION**
- Remove redundancy while maintaining clarity
- Add concrete examples where beneficial
- Ensure actionable and measurable outcomes
- Include error handling and constraints
<<<END_TASK_METHODOLOGY>>>

<<<ENHANCEMENT_FRAMEWORK>>>
Transform basic prompts by adding:
• **Context**: Background information and domain specifics
• **Specificity**: Precise requirements and parameters
• **Structure**: Clear organization and logical flow
• **Examples**: Concrete demonstrations where helpful
• **Constraints**: Boundaries, limitations, and quality standards
• **Success Criteria**: Measurable outcomes and evaluation methods
• **Format**: Desired output structure and presentation
<<<END_ENHANCEMENT_FRAMEWORK>>>

<<<OUTPUT_REQUIREMENTS>>>
- DIRECT OUTPUT: Provide only the enhanced prompt text
- NO INTRODUCTIONS: Never start with "Here's..." or similar phrases
- NO EXPLANATIONS: Don't explain what you're doing
- SUBSTANTIAL IMPROVEMENT: Create meaningfully better prompts
- ACTIONABLE CONTENT: Ensure clear, executable instructions
<<<END_OUTPUT_REQUIREMENTS>>>

<<<EXAMPLE_TRANSFORMATIONS>>>
Basic: "website for a doctor"
Enhanced: "Design a professional medical practice website featuring: patient portal integration, appointment scheduling system, service descriptions with pricing, doctor credentials and specializations, patient testimonials, insurance information, contact details with maps, HIPAA-compliant contact forms, mobile-responsive design, and accessibility compliance (WCAG 2.1 AA standards)."

Basic: "write about climate change"  
Enhanced: "Compose a comprehensive 2000-word analysis of climate change covering: scientific evidence from IPCC reports, primary causes (greenhouse gas emissions, deforestation), current global impacts (temperature rise, extreme weather patterns), regional variations in effects, evidence-based mitigation strategies, adaptation measures, economic implications, and actionable steps for individuals and organizations. Include data visualizations, peer-reviewed sources, and specific examples from at least three different continents."
<<<END_EXAMPLE_TRANSFORMATIONS>>>`

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  // Format user input with clear delimiters (Mistral best practice)
  let userMessage = '';
  if (context && context.trim()) {
    userMessage = `<<<CONTEXT>>>
${context}
<<<END_CONTEXT>>>

<<<PROMPT_TO_ENHANCE>>>
${prompt}
<<<END_PROMPT_TO_ENHANCE>>>`;
  } else {
    userMessage = `<<<PROMPT_TO_ENHANCE>>>
${prompt}
<<<END_PROMPT_TO_ENHANCE>>>`;
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

/**
 * Enhance a prompt using Mistral AI API with optimized parameters
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
    // Use Mistral-specific message building
    const messages = buildMistralPromptEnhancementMessages(prompt, context, isRefinement);
    
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
        max_tokens: 4096,
        top_p: 0.95,        // Better quality control (Mistral recommendation)
        safe_prompt: false, // We handle safety ourselves
        random_seed: 42     // Reproducibility for testing
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
        usage: data.usage,
        optimization: 'mistral-specific-v1.0'
      }
    };
  } catch (error) {
    console.error('Error calling Mistral API:', error);
    throw error;
  }
}

/**
 * Enhance a prompt using Gemini API with full optimization pipeline
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
    const startTime = Date.now();
    
    // Import template enhancer (dynamic import to avoid circular dependencies)
    const { GeminiTemplateEnhancer, GeminiTemplateManager } = await import('./providers/gemini-templates');
    const { GeminiModelSelector, GeminiSafetyController } = await import('./providers/gemini-optimizer');
    
    // Detect task type for template optimization
    const taskType = GeminiTemplateManager.detectTaskType(prompt);
    const shouldUseTemplate = ['creative', 'reasoning', 'technical', 'educational'].includes(taskType);
    
    // Select optimal model
    const model = GeminiModelSelector.selectModel(prompt, context, taskType === 'reasoning' || taskType === 'creative');
    
    let result;
    
    if (shouldUseTemplate && !isRefinement) {
      console.log(`🎯 Using Gemini template optimization: ${taskType} (${model})`);
      
      // Use template-based enhancement
      result = await GeminiTemplateEnhancer.enhance(prompt, context, {
        forceTaskType: taskType,
        isRefinement,
        apiKey: geminiConfig.apiKey
      });
      
      return {
        enhancedPrompt: result.enhancedPrompt,
        source: 'gemini',
        metadata: {
          model,
          usage: result.metadata.usage,
          optimization: `gemini-template-${taskType}-v1.0`,
          processTime: result.metadata.processTime,
          taskType,
          finishReason: result.metadata.finishReason
        }
      };
    } else {
      // Use general Gemini-optimized enhancement
      const systemInstruction = buildGeminiSystemInstruction(isRefinement, taskType);
      const userContent = buildGeminiUserContent(prompt, context, isRefinement, taskType);
      
      // Get optimal generation configuration
      const generationConfig = getGeminiGenerationConfig(taskType, isRefinement);
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiConfig.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${systemInstruction}\n\n${userContent}` }] }],
          generationConfig,
          safetySettings: GeminiSafetyController.buildSafetySettings()
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        throw new Error('Gemini API returned no content');
      }
      
      let enhancedPrompt = data.candidates[0].content.parts[0].text;
      
      // Quality validation and post-processing
      const validation = GeminiSafetyController.validateResponse(enhancedPrompt);
      if (!validation.isValid) {
        console.warn('Gemini response quality issues:', validation.issues);
      }
      
      // Apply post-processing
      enhancedPrompt = processGeminiResponse(enhancedPrompt);
      
      return {
        enhancedPrompt,
        source: 'gemini',
        metadata: {
          model,
          usage: data.usageMetadata,
          optimization: 'gemini-optimized-v1.0',
          processTime: Date.now() - startTime,
          taskType,
          finishReason: data.candidates[0].finishReason
        }
      };
    }
  } catch (error) {
    console.error('Error calling Gemini API:', error);
    throw error;
  }
}

/**
 * Build Gemini-specific system instruction with few-shot learning
 */
function buildGeminiSystemInstruction(isRefinement: boolean = false, taskType: string = 'general'): string {
  const baseInstruction = isRefinement 
    ? `You are an expert prompt refinement specialist. Your task is to refine already-enhanced prompts by adding missing details, improving clarity, and strengthening specifications while preserving the original intent.\n\nKey principles:\n1. Build upon existing quality (don't restart from scratch)\n2. Add substantial improvements (not minor tweaks)\n3. Include concrete examples where beneficial\n4. Ensure all constraints and requirements are explicit\n5. Output ONLY the refined prompt text - no introductions or explanations`
    : `You are an expert prompt engineering specialist. Your task is to transform basic prompts into comprehensive, actionable instructions that deliver exceptional results.\n\nKey principles:\n1. Extract and clarify the core intent\n2. Add specific requirements and constraints\n3. Structure with clear hierarchy and organization\n4. Include success criteria and quality standards\n5. Specify desired format and output structure\n6. Output ONLY the enhanced prompt text - no introductions or explanations`;

  // Add task-specific guidance
  if (taskType === 'creative') {
    return baseInstruction + `\n\nCreative Focus:\n• Incorporate multi-sensory and emotional dimensions\n• Include diverse perspective requirements\n• Add inspiration sources and creative constraints\n• Specify innovation and uniqueness criteria`;
  } else if (taskType === 'technical') {
    return baseInstruction + `\n\nTechnical Focus:\n• Include architecture and design pattern considerations\n• Address scalability, performance, and security\n• Define testing strategies and quality standards\n• Specify deployment and operational requirements`;
  } else if (taskType === 'reasoning') {
    return baseInstruction + `\n\nAnalytical Focus:\n• Structure systematic thinking processes\n• Include evidence gathering requirements\n• Address potential biases and alternative perspectives\n• Define logical reasoning frameworks`;
  }
  
  return baseInstruction;
}

/**
 * Build Gemini-specific user content
 */
function buildGeminiUserContent(prompt: string, context?: string, isRefinement: boolean = false, taskType: string = 'general'): string {
  const taskAction = isRefinement ? 'REFINE' : 'ENHANCE';
  
  let content = `Task: ${taskAction} the following prompt\n\n`;
  
  if (context && context.trim()) {
    content += `Context: ${context}\n\n`;
  }
  
  if (taskType !== 'general') {
    content += `Task type: ${taskType}\n\n`;
  }
  
  content += `Prompt to ${taskAction.toLowerCase()}: ${prompt}\n\n`;
  content += `Provide only the ${isRefinement ? 'refined' : 'enhanced'} prompt text. Do not include introductions, explanations, or meta-text.`;
  
  return content;
}

/**
 * Get optimal generation configuration for Gemini based on task type
 */
function getGeminiGenerationConfig(taskType: string = 'general', isRefinement: boolean = false): any {
  const baseConfig = {
    topK: 40,
    topP: 0.95,
    maxOutputTokens: 8192,
    stopSequences: []
  };
  
  // Adjust temperature based on task type
  if (taskType === 'creative') {
    return { ...baseConfig, temperature: 0.4 }; // Higher for creativity
  } else if (taskType === 'technical') {
    return { ...baseConfig, temperature: 0.1, maxOutputTokens: 6144 }; // Lower for precision
  } else if (taskType === 'reasoning') {
    return { ...baseConfig, temperature: 0.2 }; // Balanced for analysis
  }
  
  return { ...baseConfig, temperature: 0.2 }; // Default balanced setting
}

/**
 * Process Gemini response with specific optimizations
 */
function processGeminiResponse(response: string): string {
  let cleaned = response.trim();
  
  // Remove common Gemini meta-text patterns
  const metaPatterns = [
    /^(Here's the|Here is the)\s+(enhanced|refined|improved)\s+prompt:?\s*/i,
    /^(The|This)\s+(enhanced|refined|improved)\s+prompt\s+is:?\s*/i,
    /^(Enhanced|Refined|Improved)\s+prompt:?\s*/i,
    /^\*\*(Enhanced|Refined|Improved)\s+Prompt\*\*:?\s*/i,
    /^Task:\s+(ENHANCE|REFINE).*?\n\n/i
  ];
  
  metaPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Remove markdown artifacts that Gemini sometimes includes
  cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  cleaned = cleaned.replace(/^---\n?/, '').replace(/\n?---$/, '');
  
  // Normalize formatting
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive line breaks
    .replace(/[ \t]+/g, ' ')     // Normalize spaces
    .replace(/\n /g, '\n')       // Remove leading spaces after line breaks
    .trim();
  
  // Ensure minimum quality standards
  if (cleaned.length < 50) {
    cleaned += '. Include comprehensive details, clear structure, and specific requirements for optimal results.';
  }
  
  // Ensure proper sentence endings
  if (!cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}

/**
 * Build the messages array for prompt enhancement with Chain-of-Thought reasoning
 */
function buildPromptEnhancementMessages(
  prompt: string,
  context?: string,
  isRefinement: boolean = false
): Array<{ role: string, content: string }> {
  // TODO: Use enhanced system prompt from repository in the future
  // const promptRepo = PromptRepository.getInstance();
  
  const baseSystemPrompt = `You are an expert prompt engineer that enhances prompts to make them clearer and more effective. 

CHAIN-OF-THOUGHT PROCESS:
Think through your enhancement step-by-step:

1. ANALYSIS: First, analyze the prompt's current state
   - What is the core intent and domain?
   - What specific information is missing?
   - What ambiguities exist?
   - How clear are the success criteria?

2. PLANNING: Plan your enhancements
   - What specific details should be added?
   - What structure would improve clarity?
   - What domain-specific requirements apply?
   - How can you make it more actionable?

3. ENHANCEMENT: Apply systematic improvements
   - Add missing context and specifications
   - Improve organization and flow
   - Include success criteria and constraints
   - Ensure completeness without redundancy

Follow these guidelines:
1. Identify the core purpose and domain of the prompt
2. Add specific details and clarity without changing the original intent
3. Remove redundancies and improve organization
4. Add relevant specifications for structure or format if appropriate
5. Include measurable success criteria where appropriate
6. Consider edge cases and potential misunderstandings
7. DO NOT add "You are..." or role descriptions unless specifically needed
8. The output should be ONLY the enhanced prompt text, nothing else
9. NEVER include phrases like "Here's the refined prompt:" or explanations
10. Keep your response concise and focused on improving the prompt content only
11. If the prompt appears to be already enhanced, BUILD UPON IT - add detail, clarity, or structure
12. Each refinement should be better than the previous one, never just repeat the input

Examples of good enhancements:
- "website for a doctor" → "Design a professional website for a medical practitioner. Include sections for services offered, patient resources and education, professional credentials and certifications, appointment scheduling system, insurance information, and contact details. Ensure mobile responsiveness and accessibility compliance."
- "write about climate change" → "Write a comprehensive analysis of climate change, covering its primary causes (greenhouse gas emissions, deforestation), current global impacts (rising temperatures, extreme weather), future projections based on IPCC models, and evidence-based mitigation and adaptation solutions. Include supporting data from peer-reviewed sources and scientific consensus statements."`;

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
    let promptString = String(rawPrompt).trim();
    const contextString = context ? String(context).trim() : "";
    
    // Don't proceed with enhancement if the prompt is empty
    if (!promptString) {
      return '';
    }

    // Safety validation first
    const safetyValidator = new SafetyValidator();
    const safetyResult = safetyValidator.validateSafety(promptString, contextString);
    
    if (!safetyResult.isSafe) {
      console.warn('Safety validation failed:', safetyResult.checks);
      if (safetyResult.requiresHumanReview) {
        throw new Error('Prompt requires human review due to safety concerns');
      }
      // Use sanitized prompt if available
      if (safetyResult.sanitizedPrompt) {
        console.log('Using sanitized prompt');
        promptString = safetyResult.sanitizedPrompt;
      }
    }

    // Use the new ContextManager for intelligent context processing
    const contextManager = new AdvancedContextManager();
    
    // Create context chunks
    const contextChunks = [];
    if (contextString) {
      contextChunks.push({
        id: 'user-context',
        content: contextString,
        type: 'context' as const,
        priority: 0.8,
        tokens: contextString.split(' ').length,
        metadata: { source: 'user-provided' }
      });
    }
    
    const optimizedContext = await contextManager.optimizeContext(contextChunks);
    const processedContext = optimizedContext.chunks.map(c => c.content).join(' ');
    
    // Try adaptive enhancer first (uses learned patterns)
    const adaptiveEnhancer = new AdaptiveEnhancer();
    const adaptiveResult = await adaptiveEnhancer.enhance(promptString);
    
    if (adaptiveResult.source === 'learned' && adaptiveResult.confidence >= 0.8) {
      console.log('Using learned pattern enhancement with high confidence:', adaptiveResult.confidence);
      // Store this as a successful local enhancement
      await storeEnhancementExample(promptString, processedContext, adaptiveResult.enhanced, 'local');
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
      const minimallyEnhanced = minimalEnhance(promptString, processedContext);
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
        result = await enhanceWithDeepseek(promptString, processedContext, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('DeepSeek returned identical prompt');
        }
        
        // Calculate quality metrics and store result for training
        const metricsCalculator = new MetricsCalculator();
        const enhancementMetrics = metricsCalculator.comparePrompts(promptString, result.enhancedPrompt);
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, processedContext, result.enhancedPrompt, 'deepseek');
        
        // Log quality improvement
        console.log(`DeepSeek enhancement quality: ${enhancementMetrics.enhancementType} improvement (${enhancementMetrics.improvementScore}% better)`);
        
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('DeepSeek API failed, falling back to Mistral:', error);
      }
    }
    
    // Try Mistral API if DeepSeek fails or is not configured
    if (mistralConfig.enabled) {
      try {
        result = await enhanceWithMistral(promptString, processedContext, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('Mistral returned identical prompt');
        }
        
        // Calculate quality metrics and store result for training
        const metricsCalculator = new MetricsCalculator();
        const enhancementMetrics = metricsCalculator.comparePrompts(promptString, result.enhancedPrompt);
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, processedContext, result.enhancedPrompt, 'mistral');
        
        // Log quality improvement
        console.log(`Mistral enhancement quality: ${enhancementMetrics.enhancementType} improvement (${enhancementMetrics.improvementScore}% better)`);
        
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('Mistral API failed, falling back to Gemini:', error);
      }
    }
    
    // Try Gemini API if both DeepSeek and Mistral fail
    if (geminiConfig.enabled) {
      try {
        result = await enhanceWithGemini(promptString, processedContext, isRefinement);
        
        // Verify the result is actually different from the input
        if (result.enhancedPrompt === promptString) {
          throw new Error('Gemini returned identical prompt');
        }
        
        // Calculate quality metrics and store result for training
        const metricsCalculator = new MetricsCalculator();
        const enhancementMetrics = metricsCalculator.comparePrompts(promptString, result.enhancedPrompt);
        
        // Store this result for training our own engine
        await storeEnhancementExample(promptString, processedContext, result.enhancedPrompt, 'gemini');
        
        // Log quality improvement
        console.log(`Gemini enhancement quality: ${enhancementMetrics.enhancementType} improvement (${enhancementMetrics.improvementScore}% better)`);
        
        return result.enhancedPrompt;
      } catch (error) {
        console.warn('Gemini API failed, falling back to local engine:', error);
      }
    }
    
    // Fall back to local enhancement engine if all APIs fail or aren't configured
    const localResult = await localEnhance(promptString, processedContext);
    
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
      promptLength: rawPrompt.length,
      hasContext: !!context,
      isRefinement: false,
      isExpansion: false,
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
        originalPrompt: originalPrompt,
        enhancedPrompt: enhancedPrompt,
        wasSuccessful: wasSuccessful,
        score: score,
        feedbackText: feedbackText,
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