// Optimized LLM enhancer for Cloudflare Functions with sophisticated analysis

interface EnhancementResponse {
  enhancedPrompt: string;
  source: 'claude' | 'openai' | 'deepseek' | 'mistral' | 'moonshot' | 'gemini' | 'local';
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
    ? `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Refinement Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: REFINED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <absolute_constraint>
    OUTPUT = refined_prompt_text_only
    NO_PHRASES = ["Here's", "Here is", "Here's an", "Here is an", "This is", "The enhanced", "The refined", "Below", "I've improved", "I have", "version of your prompt", "enhanced prompt", "refined version"]
    DIRECT_OUTPUT = true
  </absolute_constraint>
  
  <refinement_strategy>
    <analyze>Identify gaps in current prompt</analyze>
    <enhance>Add missing edge cases and specifications</enhance>
    <optimize>Remove redundancy while preserving clarity</optimize>
    <structure>Improve logical flow and hierarchy</structure>
    <validate>Ensure all ambiguity eliminated</validate>
  </refinement_strategy>
  
  <enhancement_checklist>
    □ Has clear success criteria?
    □ Includes failure handling?
    □ Specifies exact format?
    □ Contains examples?
    □ Defines constraints?
    □ Sets quality bar?
    □ Actionable steps?
  </enhancement_checklist>
  
  <output_validator>
    if response.contains(["Here's", "This is", "The enhanced", "Below"]):
      REJECT_AND_RETRY
    else:
      RETURN enhanced_text_only
  </output_validator>
</prompt_enhancement_system>`
    : `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Engineering Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: ENHANCED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <critical_rules>
    <rule priority="ABSOLUTE">Output ONLY the enhanced prompt text</rule>
    <rule priority="ABSOLUTE">No meta-text, introductions, or explanations</rule>
    <rule priority="ABSOLUTE">Response = enhanced_prompt_only</rule>
    <rule priority="ABSOLUTE">Never use phrases like "Here's", "This is", "Below", etc.</rule>
  </critical_rules>
  
  <enhancement_pipeline>
    <stage_1>Intent extraction with semantic analysis</stage_1>
    <stage_2>Gap identification using completeness matrix</stage_2>
    <stage_3>Structure optimization with hierarchy design</stage_3>
    <stage_4>Specificity injection with examples where needed</stage_4>
    <stage_5>Token optimization without clarity loss</stage_5>
    <stage_6>Output validation against rules</stage_6>
  </enhancement_pipeline>
  
  <quality_gates>
    <gate_1>Specificity ≥ 90%</gate_1>
    <gate_2>Ambiguity = 0</gate_2>
    <gate_3>Actionability = 100%</gate_3>
  </quality_gates>
  
  <output_validator>
    <regex_check pattern="^(?!.*Here's|.*Here is|.*This is|.*Below).*$"/>
    <format_check type="direct_text_only"/>
    <quality_check minimum_score="85"/>
  </output_validator>
</prompt_enhancement_system>`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `<input_data>\n<context>${context}</context>\n<prompt_to_enhance>${prompt}</prompt_to_enhance>\n</input_data>`;
  } else {
    userMessage = `<prompt_to_enhance>${prompt}</prompt_to_enhance>`;
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

// Post-process enhanced prompts to remove any intro/outro text
function cleanEnhancedPrompt(text: string): string {
  // Remove common intro phrases
  const introPatterns = [
    // Exact pattern from screenshot
    /^Here's an enhanced,.*?version of your prompt:?\s*/i,
    /^Here is an enhanced,.*?version of your prompt:?\s*/i,
    
    // Enhanced prompt specific patterns (user requested)
    /^Here's the enhanced prompt:?\s*/i,
    /^Here is the enhanced prompt:?\s*/i,
    /^The enhanced prompt is:?\s*/i,
    /^Your enhanced prompt:?\s*/i,
    /^Below is the enhanced prompt:?\s*/i,
    /^This enhanced prompt:?\s*/i,
    
    // Comprehensive patterns for any descriptive intro
    /^Here's an? (?:enhanced|refined|improved|better|more specific|detailed).*?(?:prompt|version):?\s*/i,
    /^Here is an? (?:enhanced|refined|improved|better|more specific|detailed).*?(?:prompt|version):?\s*/i,
    /^Here's the (?:enhanced|refined|improved).*?(?:prompt|version):?\s*/i,
    /^Here is the (?:enhanced|refined|improved).*?(?:prompt|version):?\s*/i,
    
    // Original patterns
    /^Here's the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^Here is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^This is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^The (?:enhanced|refined|improved) (?:prompt|version) is:?\s*/i,
    /^I've (?:enhanced|refined|improved) (?:the|your) prompt:?\s*/i,
    /^I have (?:enhanced|refined|improved) (?:the|your) prompt:?\s*/i,
    /^Below is the (?:enhanced|refined|improved) (?:prompt|version):?\s*/i,
    /^Your (?:enhanced|refined|improved) prompt:?\s*/i,
    /^Enhanced prompt:?\s*/i,
    /^Refined prompt:?\s*/i,
    /^Improved prompt:?\s*/i,
    /^\*\*Enhanced Prompt\*\*:?\s*/i,
    /^\*\*Refined Prompt\*\*:?\s*/i,
  ];
  
  let cleaned = text.trim();
  
  // Remove intro patterns
  for (const pattern of introPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  // Remove quotes if the entire prompt is wrapped in them
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || 
      (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
    cleaned = cleaned.slice(1, -1);
  }
  
  // Remove markdown code block if present
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
  }
  
  // Remove outro phrases
  const outroPatterns = [
    /\n+(?:This|The above) (?:enhanced|refined|improved) prompt.*$/i,
    /\n+I hope this (?:enhanced|refined|improved) version.*$/i,
    /\n+Feel free to (?:use|modify|adjust).*$/i,
    /\n+Let me know if you.*$/i,
  ];
  
  for (const pattern of outroPatterns) {
    cleaned = cleaned.replace(pattern, '');
  }
  
  return cleaned.trim();
}

// Test function to verify cleaning works (for development)
function testCleanEnhancedPrompt() {
  const testTexts = [
    "Here's an enhanced, more specific, and actionable version of your prompt:\n\n---\n\n**Prompt:**\nExplain the step-by-step process...",
    "Here's the enhanced prompt:\n\nExplain the step-by-step process...",
    "The enhanced prompt is:\n\nExplain the step-by-step process...",
    "Your enhanced prompt:\n\nExplain the step-by-step process..."
  ];
  
  testTexts.forEach((testText, i) => {
    const cleaned = cleanEnhancedPrompt(testText);
    console.log(`TEST ${i+1} - Original:`, testText.substring(0, 50) + '...');
    console.log(`TEST ${i+1} - Cleaned:`, cleaned.substring(0, 50) + '...');
    console.log('---');
  });
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
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`DeepSeek API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
    source: 'deepseek',
    metadata: { model: 'deepseek-chat', usage: data.usage }
  };
}

// Build Mistral-specific enhancement messages optimized for Mistral's capabilities
function buildMistralPromptEnhancementMessages(prompt: string, context?: string, isRefinement: boolean = false) {
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

// Mistral enhancement with full optimization pipeline
async function enhanceWithMistral(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Mistral API key not configured');
  }

  const startTime = Date.now();

  // Detect optimal model based on complexity
  const model = selectMistralModel(prompt, context);
  const complexity = assessPromptComplexity(prompt);
  
  // Use template-based enhancement for better results
  const useTemplateOptimization = !isRefinement && shouldUseTemplateOptimization(prompt);
  
  let messages;
  let parameters;
  
  if (useTemplateOptimization) {
    // Use specialized template for detected task type
    const taskType = detectMistralTaskType(prompt);
    const templateResult = buildMistralTemplateMessages(prompt, context, taskType);
    messages = templateResult.messages;
    parameters = templateResult.parameters;
    
    console.log(`🎯 Using Mistral template optimization: ${taskType} (${model})`);
  } else {
    // Use general Mistral-optimized messages
    messages = buildMistralPromptEnhancementMessages(prompt, context, isRefinement);
    parameters = {
      temperature: 0.2,
      max_tokens: 4096,
      top_p: 0.95,
      safe_prompt: false,
      random_seed: 42
    };
  }
  
  const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      ...parameters
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Mistral API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  let enhancedContent = data.choices[0].message.content;
  
  // Apply Mistral-specific post-processing
  enhancedContent = processMistralResponse(enhancedContent);
  
  return {
    enhancedPrompt: cleanEnhancedPrompt(enhancedContent),
    source: 'mistral',
    metadata: { 
      model,
      usage: data.usage,
      optimization: useTemplateOptimization ? 'mistral-template-v1.0' : 'mistral-specific-v1.0',
      complexity,
      taskType: useTemplateOptimization ? detectMistralTaskType(prompt) : undefined,
      processTime: Date.now() - startTime
    }
  };
}

// Mistral model selection based on complexity
function selectMistralModel(prompt: string, context?: string): string {
  const totalLength = prompt.length + (context?.length || 0);
  const complexity = assessPromptComplexity(prompt);
  
  // Use smaller, faster models for simple tasks (cost optimization)
  if (complexity === 'simple' && totalLength < 500) {
    return 'mistral-small-latest';
  }
  
  // Use medium model for moderate complexity
  if (complexity === 'moderate' && totalLength < 2000) {
    return 'mistral-medium-latest';
  }
  
  // Use large model for complex tasks or long content
  return 'mistral-large-latest';
}

// Assess prompt complexity for optimization
function assessPromptComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
  // Simple: basic transformations, short prompts
  if (prompt.length < 100 && !hasComplexPatterns(prompt)) {
    return 'simple';
  }
  
  // Complex: technical content, multiple requirements, long prompts
  if (prompt.length > 500 || hasComplexPatterns(prompt)) {
    return 'complex';
  }
  
  return 'moderate';
}

// Check for complex patterns requiring advanced processing
function hasComplexPatterns(prompt: string): boolean {
  const complexPatterns = [
    /\b(analysis|evaluation|comparison|synthesis)\b/i,
    /\b(step-by-step|methodology|framework|strategy)\b/i,
    /\b(requirements|specifications|criteria|constraints)\b/i,
    /\b(technical|professional|academic|scientific)\b/i,
    /[0-9]+\s*(steps|phases|sections|parts)/i
  ];
  
  return complexPatterns.some(pattern => pattern.test(prompt));
}

// Detect Mistral task type for template optimization
function detectMistralTaskType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  
  // Classification indicators (Mistral's strength)
  if (hasPatterns(lowerPrompt, ['classify', 'categorize', 'label', 'tag', 'type of', 'which category'])) {
    return 'classification';
  }
  
  // Summarization indicators (Mistral excels here)
  if (hasPatterns(lowerPrompt, ['summarize', 'summary', 'brief', 'overview', 'key points', 'tldr'])) {
    return 'summarization';
  }
  
  // Evaluation indicators (Another Mistral strength)
  if (hasPatterns(lowerPrompt, ['evaluate', 'assess', 'review', 'rate', 'score', 'judge', 'analyze quality'])) {
    return 'evaluation';
  }
  
  // Analysis indicators
  if (hasPatterns(lowerPrompt, ['analyze', 'analysis', 'examine', 'investigate', 'research', 'study'])) {
    return 'analysis';
  }
  
  // Default to general enhancement
  return 'general';
}

// Check for specific patterns in text
function hasPatterns(text: string, patterns: string[]): boolean {
  return patterns.some(pattern => text.includes(pattern));
}

// Determine if template optimization should be used
function shouldUseTemplateOptimization(prompt: string): boolean {
  const taskType = detectMistralTaskType(prompt);
  // Use template optimization for specific task types where Mistral excels
  return ['classification', 'summarization', 'evaluation', 'analysis'].includes(taskType);
}

// Build template-optimized messages (simplified version for server-side)
function buildMistralTemplateMessages(prompt: string, context?: string, taskType: string) {
  // Simplified template system for server-side use
  const templates = {
    classification: {
      systemPrompt: `### CLASSIFICATION SPECIALIST ###

<<<ROLE>>>
You are an expert classification specialist transforming vague prompts into precise categorization and labeling instructions with clear criteria and systematic approaches.
<<<END_ROLE>>>

<<<ENHANCEMENT_FOCUS>>>
- Define clear classification categories and criteria
- Add systematic evaluation methodology  
- Include confidence scoring requirements
- Specify output format and structure
- Add validation and quality control steps
<<<END_ENHANCEMENT_FOCUS>>>

<<<OUTPUT_REQUIREMENTS>>>
Provide only the enhanced prompt text with clear classification framework, structured approach, and measurable criteria.
<<<END_OUTPUT_REQUIREMENTS>>>`,
      parameters: { temperature: 0.1, top_p: 0.9, max_tokens: 2048 }
    },
    
    summarization: {
      systemPrompt: `### SUMMARIZATION EXPERT ###

<<<ROLE>>>
You are a master summarization specialist enhancing prompts to create comprehensive, accurate, and well-structured summary instructions.
<<<END_ROLE>>>

<<<ENHANCEMENT_FOCUS>>>
- Define summarization scope and depth requirements
- Add structure and organization guidelines
- Specify key information extraction criteria  
- Include length and format specifications
- Add quality and accuracy validation methods
<<<END_ENHANCEMENT_FOCUS>>>

<<<OUTPUT_REQUIREMENTS>>>
Provide only the enhanced prompt text with clear summarization framework, content priorities, and structured approach.
<<<END_OUTPUT_REQUIREMENTS>>>`,
      parameters: { temperature: 0.2, top_p: 0.95, max_tokens: 3072 }
    },
    
    evaluation: {
      systemPrompt: `### EVALUATION SPECIALIST ###

<<<ROLE>>>
You are an expert evaluation specialist enhancing prompts to create systematic, objective, and comprehensive assessment instructions.
<<<END_ROLE>>>

<<<ENHANCEMENT_FOCUS>>>
- Define clear evaluation criteria and scoring scales
- Add systematic assessment methodology
- Include evidence and justification requirements
- Specify structured output format with scores
- Add consistency and bias reduction measures
<<<END_ENHANCEMENT_FOCUS>>>

<<<OUTPUT_REQUIREMENTS>>>
Provide only the enhanced prompt text with evaluation framework, scoring systems, and systematic assessment approach.
<<<END_OUTPUT_REQUIREMENTS>>>`,
      parameters: { temperature: 0.1, top_p: 0.9, max_tokens: 2560 }
    },
    
    analysis: {
      systemPrompt: `### ANALYSIS EXPERT ###

<<<ROLE>>>
You are a skilled analytical expert enhancing prompts to create thorough, multi-dimensional, and insightful analysis instructions.
<<<END_ROLE>>>

<<<ENHANCEMENT_FOCUS>>>
- Define comprehensive analysis scope and methodology
- Add multi-perspective examination requirements
- Include pattern recognition and insight generation
- Specify evidence-based conclusion requirements
- Add structured reporting and recommendation formats
<<<END_ENHANCEMENT_FOCUS>>>

<<<OUTPUT_REQUIREMENTS>>>
Provide only the enhanced prompt text with analytical framework, systematic approach, and comprehensive investigation methods.
<<<END_OUTPUT_REQUIREMENTS>>>`,
      parameters: { temperature: 0.3, top_p: 0.95, max_tokens: 4096 }
    }
  };
  
  const template = templates[taskType] || templates.analysis;
  
  const messages = [
    { role: 'system', content: template.systemPrompt }
  ];
  
  // Format user input with delimiters
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
  
  messages.push({ role: 'user', content: userMessage });
  
  return {
    messages,
    parameters: template.parameters
  };
}

// Process Mistral response with specific optimizations
function processMistralResponse(response: string): string {
  let cleaned = response.trim();
  
  // Remove Mistral-specific artifacts
  cleaned = cleaned.replace(/<<<[^>]*>>>/g, ''); // Remove delimiter artifacts
  cleaned = cleaned.replace(/###[^#]*###/g, ''); // Remove header artifacts
  cleaned = cleaned.replace(/\*\*\*[^*]*\*\*\*/g, ''); // Remove emphasis artifacts
  
  // Remove meta-text patterns
  const metaPatterns = [
    /^(Here's|Here is|This is|Below is).*?:/i,
    /^(The enhanced|The improved|The refined).*?:/i,
    /^(Enhanced prompt|Improved prompt|Refined prompt).*?:/i
  ];
  
  metaPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });
  
  // Normalize formatting
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive line breaks
    .replace(/[ \t]+/g, ' ')     // Normalize spaces
    .replace(/\n /g, '\n')       // Remove leading spaces after line breaks
    .trim();
  
  // Ensure minimum quality standards
  if (cleaned.length < 50) {
    cleaned += '. Include comprehensive information and well-organized sections for optimal results.';
  }
  
  // Ensure proper sentence endings
  if (!cleaned.match(/[.!?]$/)) {
    cleaned += '.';
  }
  
  return cleaned;
}

// Claude enhancement (Anthropic)
async function enhanceWithClaude(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.CLAUDE_API_KEY;
  if (!apiKey) {
    throw new Error('Claude API key not configured');
  }

  const systemPrompt = isRefinement 
    ? `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Refinement Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: REFINED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <absolute_constraint>
    OUTPUT = refined_prompt_text_only
    NO_PHRASES = ["Here's", "Here is", "Here's an", "Here is an", "This is", "The enhanced", "The refined", "Below", "I've improved", "I have", "version of your prompt", "enhanced prompt", "refined version"]
    DIRECT_OUTPUT = true
  </absolute_constraint>
  
  <refinement_strategy>
    <analyze>Identify gaps in current prompt</analyze>
    <enhance>Add missing edge cases and specifications</enhance>
    <optimize>Remove redundancy while preserving clarity</optimize>
    <structure>Improve logical flow and hierarchy</structure>
    <validate>Ensure all ambiguity eliminated</validate>
  </refinement_strategy>
  
  <output_validator>
    if response.contains(["Here's", "This is", "The enhanced", "Below"]):
      REJECT_AND_RETRY
    else:
      RETURN enhanced_text_only
  </output_validator>
</prompt_enhancement_system>`
    : `<prompt_enhancement_system version="3.0">
  <role expertise="maximum">Elite Prompt Engineering Specialist</role>
  
  <prime_directive>
    OUTPUT_MODE: ENHANCED_TEXT_ONLY
    META_TEXT: FORBIDDEN
    EXPLANATIONS: FORBIDDEN
    FORMAT: DIRECT_PROMPT_OUTPUT
  </prime_directive>
  
  <critical_rules>
    <rule priority="ABSOLUTE">Output ONLY the enhanced prompt text</rule>
    <rule priority="ABSOLUTE">No meta-text, introductions, or explanations</rule>
    <rule priority="ABSOLUTE">Response = enhanced_prompt_only</rule>
    <rule priority="ABSOLUTE">Never use phrases like "Here's", "This is", "Below", etc.</rule>
  </critical_rules>
  
  <enhancement_pipeline>
    <stage_1>Intent extraction with semantic analysis</stage_1>
    <stage_2>Gap identification using completeness matrix</stage_2>
    <stage_3>Structure optimization with hierarchy design</stage_3>
    <stage_4>Specificity injection with examples where needed</stage_4>
    <stage_5>Token optimization without clarity loss</stage_5>
    <stage_6>Output validation against rules</stage_6>
  </enhancement_pipeline>
  
  <quality_gates>
    <gate_1>Specificity ≥ 90%</gate_1>
    <gate_2>Ambiguity = 0</gate_2>
    <gate_3>Actionability = 100%</gate_3>
  </quality_gates>
  
  <output_validator>
    <regex_check pattern="^(?!.*Here's|.*Here is|.*This is|.*Below).*$"/>
    <format_check type="direct_text_only"/>
    <quality_check minimum_score="85"/>
  </output_validator>
</prompt_enhancement_system>`;

  let userMessage = prompt;
  if (context && context.trim()) {
    userMessage = `<input_data>\n<context>${context}</context>\n<prompt_to_enhance>${prompt}</prompt_to_enhance>\n</input_data>`;
  } else {
    userMessage = `<prompt_to_enhance>${prompt}</prompt_to_enhance>`;
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
      max_tokens: 4096,
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
    enhancedPrompt: cleanEnhancedPrompt(data.content[0].text),
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
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`OpenAI API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
    source: 'openai',
    metadata: { model: 'gpt-4o-mini', usage: data.usage }
  };
}

// Gemini enhancement (Google)
async function enhanceWithGemini(prompt: string, context?: string, isRefinement: boolean = false, env: Record<string, string> = {}): Promise<EnhancementResponse> {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Gemini API key not configured');
  }

  const startTime = Date.now();
  const model = 'gemini-1.5-pro';
  
  // Build Gemini-optimized system instructions with few-shot learning
  const systemInstruction = buildGeminiSystemInstruction(isRefinement);
  const userContent = buildGeminiUserContent(prompt, context, isRefinement);
  
  // Gemini API uses a different structure than OpenAI-compatible APIs
  const requestBody = {
    contents: [{
      parts: [{
        text: `${systemInstruction}\n\n${userContent}`
      }]
    }],
    generationConfig: {
      temperature: 0.2,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      stopSequences: []
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE'
      }
    ]
  };
  
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  
  if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
    throw new Error('Gemini API returned no content');
  }
  
  let enhancedContent = data.candidates[0].content.parts[0].text;
  
  // Apply Gemini-specific post-processing
  enhancedContent = processGeminiResponse(enhancedContent);
  
  return {
    enhancedPrompt: cleanEnhancedPrompt(enhancedContent),
    source: 'gemini',
    metadata: { 
      model,
      usage: data.usageMetadata,
      optimization: 'gemini-optimized-v1.0',
      processTime: Date.now() - startTime,
      finishReason: data.candidates[0].finishReason
    }
  };
}

// Build Gemini-specific system instruction with few-shot learning
function buildGeminiSystemInstruction(isRefinement: boolean = false): string {
  const baseInstruction = isRefinement 
    ? `You are an expert prompt refinement specialist. Your task is to refine already-enhanced prompts by adding missing details, improving clarity, and strengthening specifications while preserving the original intent.

Key principles:
1. Build upon existing quality (don't restart from scratch)
2. Add substantial improvements (not minor tweaks)
3. Include concrete examples where beneficial
4. Ensure all constraints and requirements are explicit
5. Output ONLY the refined prompt text - no introductions or explanations`
    : `You are an expert prompt engineering specialist. Your task is to transform basic prompts into comprehensive, actionable instructions that deliver exceptional results.

Key principles:
1. Extract and clarify the core intent
2. Add specific requirements and constraints
3. Structure with clear hierarchy and organization
4. Include success criteria and quality standards
5. Specify desired format and output structure
6. Output ONLY the enhanced prompt text - no introductions or explanations`;

  // Add few-shot learning examples
  const examples = `
Few-shot examples:

Basic: "write about climate change"
Enhanced: "Compose a comprehensive 1500-word analysis of climate change covering: current scientific evidence from IPCC reports, primary causes (greenhouse gas emissions, deforestation, industrial processes), observable global impacts (temperature rise, sea level changes, extreme weather patterns), regional variations in effects, evidence-based mitigation strategies, adaptation measures being implemented worldwide, economic implications for different sectors, and specific actionable steps for individuals, businesses, and governments. Include recent data from peer-reviewed sources, cite specific examples from at least three different continents, and structure the analysis with clear sections and subheadings."

Basic: "create a website"
Enhanced: "Design a professional business website including: modern responsive layout compatible with desktop, tablet, and mobile devices, homepage with clear value proposition and call-to-action, about us page with team credentials and company history, services/products page with detailed descriptions and pricing, testimonials section with customer reviews and case studies, contact page with multiple contact methods and location map, blog section for content marketing, SEO optimization with proper meta tags and schema markup, fast loading speed (under 3 seconds), accessibility compliance (WCAG 2.1 AA standards), and integration with analytics tracking and lead capture forms."

Basic: "analyze data"
Enhanced: "Conduct a comprehensive data analysis including: initial data exploration with summary statistics and distribution analysis, data quality assessment identifying missing values, outliers, and inconsistencies, appropriate statistical tests or modeling techniques based on data type and research questions, visualizations including histograms, scatter plots, correlation matrices, and trend charts, interpretation of results with confidence intervals and statistical significance testing, identification of key patterns, relationships, and anomalies, actionable insights and recommendations based on findings, methodology documentation explaining approach and assumptions, and executive summary highlighting the most important discoveries with business implications."${isRefinement ? 
    `

Refinement example:
Already-Enhanced: "Design a professional medical practice website featuring patient portal integration, appointment scheduling, and service descriptions."
Refined: "Design a comprehensive medical practice website featuring: HIPAA-compliant patient portal with secure login, medical records access, and prescription refill requests; intelligent appointment scheduling system with automated reminders via email/SMS, availability calendar, and waiting list management; detailed service descriptions organized by specialty with treatment explanations, preparation instructions, and expected outcomes; doctor profiles with credentials, specializations, education, and patient reviews; insurance verification tools with real-time eligibility checking and pre-authorization workflows; telemedicine integration for virtual consultations with video calling and secure messaging; patient education library with condition-specific resources, post-treatment care instructions, and medication guides; accessibility compliance meeting ADA and WCAG 2.1 AA standards; mobile-responsive design optimized for tablet/smartphone usage; and multilingual support for diverse patient populations."` : ''}`;

  return baseInstruction + examples;
}

// Build Gemini-specific user content
function buildGeminiUserContent(prompt: string, context?: string, isRefinement: boolean = false): string {
  const taskType = isRefinement ? 'REFINE' : 'ENHANCE';
  
  let content = `Task: ${taskType} the following prompt\n\n`;
  
  if (context && context.trim()) {
    content += `Context: ${context}\n\n`;
  }
  
  content += `Prompt to ${taskType.toLowerCase()}: ${prompt}\n\n`;
  content += `Provide only the ${isRefinement ? 'refined' : 'enhanced'} prompt text. Do not include introductions, explanations, or meta-text.`;
  
  return content;
}

// Process Gemini response with specific optimizations
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
      max_tokens: 4096
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Moonshot API error: ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  return {
    enhancedPrompt: cleanEnhancedPrompt(data.choices[0].message.content),
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
  console.log('DeepSeek key:', !!env.DEEPSEEK_API_KEY, '(DISABLED - too much intro/outro text)');
  console.log('Mistral key:', !!env.MISTRAL_API_KEY);
  console.log('Moonshot key:', !!env.MOONSHOT_API_KEY);
  console.log('Gemini key:', !!env.GEMINI_API_KEY);
  
  if (env.CLAUDE_API_KEY) {
    availableProviders.push({ name: 'claude', fn: (p: string, c?: string, r?: boolean) => enhanceWithClaude(p, c, r, env) });
  }
  if (env.OPENAI_API_KEY) {
    availableProviders.push({ name: 'openai', fn: (p: string, c?: string, r?: boolean) => enhanceWithOpenAI(p, c, r, env) });
  }
  // DeepSeek disabled - too stubborn with intro/outro text despite XML constraints
  // if (env.DEEPSEEK_API_KEY) {
  //   availableProviders.push({ name: 'deepseek', fn: (p: string, c?: string, r?: boolean) => enhanceWithDeepseek(p, c, r, env) });
  // }
  if (env.MISTRAL_API_KEY) {
    availableProviders.push({ name: 'mistral', fn: (p: string, c?: string, r?: boolean) => enhanceWithMistral(p, c, r, env) });
  }
  if (env.MOONSHOT_API_KEY) {
    availableProviders.push({ name: 'moonshot', fn: (p: string, c?: string, r?: boolean) => enhanceWithMoonshot(p, c, r, env) });
  }
  if (env.GEMINI_API_KEY) {
    availableProviders.push({ name: 'gemini', fn: (p: string, c?: string, r?: boolean) => enhanceWithGemini(p, c, r, env) });
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
          deepseek: `${!!env.DEEPSEEK_API_KEY} (DISABLED)`,
          mistral: !!env.MISTRAL_API_KEY,
          moonshot: !!env.MOONSHOT_API_KEY,
          gemini: !!env.GEMINI_API_KEY
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