/**
 * Mistral AI Optimization Utilities
 * Implements Mistral-specific features and best practices for prompt enhancement
 */

// Mistral-specific configuration
export interface MistralConfig {
  model: 'mistral-large-latest' | 'mistral-medium-latest' | 'mistral-small-latest';
  temperature: number;
  top_p: number;
  max_tokens: number;
  safe_prompt: boolean;
  random_seed?: number;
}

// Enhanced response interface with Mistral-specific features
export interface MistralEnhancementResponse {
  enhancedPrompt: string;
  source: 'mistral';
  confidence?: number;
  reasoning?: string;
  evaluation?: MistralEvaluation;
  metadata: {
    model: string;
    usage?: any;
    optimization: string;
    processTime: number;
    complexity: 'simple' | 'moderate' | 'complex';
  };
}

// Evaluation structure for Mistral responses
export interface MistralEvaluation {
  clarity: number;        // 1-10 scale
  specificity: number;    // 1-10 scale
  actionability: number;  // 1-10 scale
  completeness: number;   // 1-10 scale
  overall: number;        // 1-10 scale
  improvements: string[];
}

/**
 * Mistral Model Selector - chooses optimal model based on task complexity
 */
export class MistralModelSelector {
  static selectModel(prompt: string, context?: string): MistralConfig['model'] {
    const totalLength = prompt.length + (context?.length || 0);
    const complexity = this.assessComplexity(prompt);
    
    // Use smaller, faster models for simple tasks
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
  
  private static assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    // Simple: basic transformations, short prompts
    if (prompt.length < 100 && !this.hasComplexPatterns(prompt)) {
      return 'simple';
    }
    
    // Complex: technical content, multiple requirements, long prompts
    if (prompt.length > 500 || this.hasComplexPatterns(prompt)) {
      return 'complex';
    }
    
    return 'moderate';
  }
  
  private static hasComplexPatterns(prompt: string): boolean {
    const complexPatterns = [
      /\b(analysis|evaluation|comparison|synthesis)\b/i,
      /\b(step-by-step|methodology|framework|strategy)\b/i,
      /\b(requirements|specifications|criteria|constraints)\b/i,
      /\b(technical|professional|academic|scientific)\b/i,
      /[0-9]+\s*(steps|phases|sections|parts)/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(prompt));
  }
}

/**
 * Mistral Confidence Scorer - evaluates enhancement quality
 */
export class MistralConfidenceScorer {
  static async evaluateEnhancement(
    originalPrompt: string,
    enhancedPrompt: string,
    apiKey: string
  ): Promise<MistralEvaluation> {
    const evaluationPrompt = this.buildEvaluationPrompt(originalPrompt, enhancedPrompt);
    
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'mistral-medium-latest', // Use medium model for evaluation
          messages: [{ role: 'user', content: evaluationPrompt }],
          temperature: 0.1, // Low temperature for consistent evaluation
          max_tokens: 1000
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mistral evaluation failed: ${response.status}`);
      }
      
      const data = await response.json();
      return this.parseEvaluationResponse(data.choices[0].message.content);
    } catch (error) {
      console.warn('Mistral evaluation failed, using fallback scoring:', error);
      return this.fallbackEvaluation(originalPrompt, enhancedPrompt);
    }
  }
  
  private static buildEvaluationPrompt(original: string, enhanced: string): string {
    return `### PROMPT ENHANCEMENT EVALUATION ###

<<<TASK>>>
Evaluate the quality of a prompt enhancement by comparing the original and enhanced versions. Provide numerical scores (1-10) and specific improvement suggestions.
<<<END_TASK>>>

<<<ORIGINAL_PROMPT>>>
${original}
<<<END_ORIGINAL_PROMPT>>>

<<<ENHANCED_PROMPT>>>
${enhanced}
<<<END_ENHANCED_PROMPT>>>

<<<EVALUATION_CRITERIA>>>
Rate each aspect from 1-10:

**CLARITY (1-10):** How clear and understandable is the enhanced prompt?
**SPECIFICITY (1-10):** How specific and detailed are the requirements?
**ACTIONABILITY (1-10):** How actionable and executable are the instructions?
**COMPLETENESS (1-10):** How complete and comprehensive is the enhancement?

**OVERALL (1-10):** Overall quality of the enhancement

**IMPROVEMENTS:** List 2-3 specific ways the prompt could be further improved.
<<<END_EVALUATION_CRITERIA>>>

<<<OUTPUT_FORMAT>>>
CLARITY: [score]
SPECIFICITY: [score]
ACTIONABILITY: [score]
COMPLETENESS: [score]
OVERALL: [score]
IMPROVEMENTS:
- [improvement 1]
- [improvement 2]
- [improvement 3]
<<<END_OUTPUT_FORMAT>>>`;
  }
  
  private static parseEvaluationResponse(response: string): MistralEvaluation {
    const scores = {
      clarity: this.extractScore(response, 'CLARITY'),
      specificity: this.extractScore(response, 'SPECIFICITY'),
      actionability: this.extractScore(response, 'ACTIONABILITY'),
      completeness: this.extractScore(response, 'COMPLETENESS'),
      overall: this.extractScore(response, 'OVERALL')
    };
    
    const improvements = this.extractImprovements(response);
    
    return { ...scores, improvements };
  }
  
  private static extractScore(text: string, criterion: string): number {
    const regex = new RegExp(`${criterion}:\\s*(\\d+(?:\\.\\d+)?)`, 'i');
    const match = text.match(regex);
    const score = match ? parseFloat(match[1]) : 7; // Default to 7 if not found
    return Math.min(Math.max(score, 1), 10); // Clamp between 1-10
  }
  
  private static extractImprovements(text: string): string[] {
    const improvementSection = text.split('IMPROVEMENTS:')[1];
    if (!improvementSection) return ['Add more specific examples', 'Include success criteria'];
    
    const improvements = improvementSection
      .split('\n')
      .filter(line => line.trim().startsWith('-'))
      .map(line => line.replace(/^-\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Take first 3 improvements
    
    return improvements.length > 0 ? improvements : ['Add more specific examples', 'Include success criteria'];
  }
  
  private static fallbackEvaluation(original: string, enhanced: string): MistralEvaluation {
    // Simple heuristic-based evaluation when API call fails
    const lengthRatio = enhanced.length / Math.max(original.length, 1);
    const hasStructure = /\d+\.|\-|\•|:/.test(enhanced);
    const hasExamples = /example|such as|for instance|including/i.test(enhanced);
    const hasConstraints = /must|should|require|ensure|include/i.test(enhanced);
    
    const baseScore = 6;
    const lengthBonus = Math.min(lengthRatio * 2, 2); // Max 2 points for length
    const structureBonus = hasStructure ? 1 : 0;
    const exampleBonus = hasExamples ? 0.5 : 0;
    const constraintBonus = hasConstraints ? 0.5 : 0;
    
    const score = Math.min(baseScore + lengthBonus + structureBonus + exampleBonus + constraintBonus, 10);
    
    return {
      clarity: score,
      specificity: score,
      actionability: score,
      completeness: score,
      overall: score,
      improvements: [
        'Add specific examples and use cases',
        'Include measurable success criteria',
        'Specify format and structure requirements'
      ]
    };
  }
}

/**
 * Mistral Chain-of-Thought Processor - implements multi-step reasoning
 */
export class MistralChainProcessor {
  static async processWithChainOfThought(
    prompt: string,
    context: string | undefined,
    apiKey: string
  ): Promise<{ reasoning: string; enhancedPrompt: string }> {
    // Step 1: Analyze intent and requirements
    const analysisResponse = await this.analyzeIntent(prompt, context, apiKey);
    
    // Step 2: Design enhancement strategy
    const strategyResponse = await this.designStrategy(prompt, analysisResponse, apiKey);
    
    // Step 3: Execute enhancement
    const enhancementResponse = await this.executeEnhancement(prompt, context, strategyResponse, apiKey);
    
    return {
      reasoning: `Analysis: ${analysisResponse}\n\nStrategy: ${strategyResponse}`,
      enhancedPrompt: enhancementResponse
    };
  }
  
  private static async analyzeIntent(prompt: string, context: string | undefined, apiKey: string): Promise<string> {
    const analysisPrompt = `### INTENT ANALYSIS ###

<<<TASK>>>
Analyze the following prompt to identify:
1. Core intent and purpose
2. Target domain/field
3. Key requirements (explicit and implicit)
4. Missing information or ambiguities
<<<END_TASK>>>

<<<PROMPT_TO_ANALYZE>>>
${prompt}
<<<END_PROMPT_TO_ANALYZE>>>

${context ? `<<<CONTEXT>>>\n${context}\n<<<END_CONTEXT>>>` : ''}

<<<OUTPUT_FORMAT>>>
INTENT: [brief description]
DOMAIN: [field/area]
REQUIREMENTS: [list key requirements]
GAPS: [list missing information]
<<<END_OUTPUT_FORMAT>>>`;

    return this.makeAPICall(analysisPrompt, apiKey, 'mistral-medium-latest');
  }
  
  private static async designStrategy(prompt: string, analysis: string, apiKey: string): Promise<string> {
    const strategyPrompt = `### ENHANCEMENT STRATEGY ###

<<<TASK>>>
Based on the intent analysis, design a specific strategy for enhancing the prompt.
<<<END_TASK>>>

<<<ORIGINAL_PROMPT>>>
${prompt}
<<<END_ORIGINAL_PROMPT>>>

<<<ANALYSIS>>>
${analysis}
<<<END_ANALYSIS>>>

<<<OUTPUT_FORMAT>>>
STRATEGY: [enhancement approach]
ADDITIONS: [what to add]
STRUCTURE: [how to organize]
EXAMPLES: [what examples to include]
<<<END_OUTPUT_FORMAT>>>`;

    return this.makeAPICall(strategyPrompt, apiKey, 'mistral-medium-latest');
  }
  
  private static async executeEnhancement(
    prompt: string, 
    context: string | undefined, 
    strategy: string, 
    apiKey: string
  ): Promise<string> {
    const enhancementPrompt = `### PROMPT ENHANCEMENT EXECUTION ###

<<<TASK>>>
Execute the enhancement strategy to create an improved version of the prompt.
Output ONLY the enhanced prompt text, no explanations.
<<<END_TASK>>>

<<<ORIGINAL_PROMPT>>>
${prompt}
<<<END_ORIGINAL_PROMPT>>>

${context ? `<<<CONTEXT>>>\n${context}\n<<<END_CONTEXT>>>` : ''}

<<<ENHANCEMENT_STRATEGY>>>
${strategy}
<<<END_ENHANCEMENT_STRATEGY>>>

<<<OUTPUT_INSTRUCTIONS>>>
Provide only the enhanced prompt text. Do not include any meta-text, explanations, or formatting instructions.
<<<END_OUTPUT_INSTRUCTIONS>>>`;

    return this.makeAPICall(enhancementPrompt, apiKey, 'mistral-large-latest');
  }
  
  private static async makeAPICall(prompt: string, apiKey: string, model: string): Promise<string> {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral API call failed: ${response.status}`);
    }
    
    const data = await response.json();
    return data.choices[0].message.content.trim();
  }
}

/**
 * Mistral Response Post-Processor - cleans and optimizes responses
 */
export class MistralResponseProcessor {
  static processResponse(rawResponse: string): string {
    let cleaned = rawResponse.trim();
    
    // Remove Mistral-specific artifacts
    cleaned = this.removeDelimiterArtifacts(cleaned);
    cleaned = this.removeMetaText(cleaned);
    cleaned = this.normalizeFormatting(cleaned);
    cleaned = this.ensureQualityStandards(cleaned);
    
    return cleaned;
  }
  
  private static removeDelimiterArtifacts(text: string): string {
    // Remove any leftover delimiter patterns
    const delimiterPatterns = [
      /<<<[^>]*>>>/g,
      /###[^#]*###/g,
      /\*\*\*[^*]*\*\*\*/g
    ];
    
    let cleaned = text;
    delimiterPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned.trim();
  }
  
  private static removeMetaText(text: string): string {
    // Remove common meta-text patterns that Mistral might include
    const metaPatterns = [
      /^(Here's|Here is|This is|Below is).*?:/i,
      /^(The enhanced|The improved|The refined).*?:/i,
      /^(Enhanced prompt|Improved prompt|Refined prompt).*?:/i,
      /^(OUTPUT|RESULT|RESPONSE).*?:/i
    ];
    
    let cleaned = text;
    metaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    return cleaned.trim();
  }
  
  private static normalizeFormatting(text: string): string {
    // Normalize spacing and line breaks
    let normalized = text
      .replace(/\n{3,}/g, '\n\n')  // Max 2 consecutive line breaks
      .replace(/[ \t]+/g, ' ')     // Normalize spaces
      .replace(/\n /g, '\n');      // Remove leading spaces after line breaks
    
    return normalized.trim();
  }
  
  private static ensureQualityStandards(text: string): string {
    // Ensure the response meets basic quality standards
    if (text.length < 50) {
      // Response is too short, likely incomplete
      return `${text}. Include comprehensive information and well-organized sections for optimal results.`;
    }
    
    // Ensure proper sentence endings
    if (!text.match(/[.!?]$/)) {
      text += '.';
    }
    
    return text;
  }
}

/**
 * Main Mistral Optimizer - orchestrates all optimizations
 */
export class MistralOptimizer {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async enhanceWithFullOptimization(
    prompt: string,
    context?: string,
    options: {
      useChainOfThought?: boolean;
      includeEvaluation?: boolean;
      isRefinement?: boolean;
    } = {}
  ): Promise<MistralEnhancementResponse> {
    const startTime = Date.now();
    const model = MistralModelSelector.selectModel(prompt, context);
    const complexity = this.assessComplexity(prompt);
    
    let enhancedPrompt: string;
    let reasoning: string | undefined;
    
    if (options.useChainOfThought && complexity !== 'simple') {
      // Use chain-of-thought for complex prompts
      const chainResult = await MistralChainProcessor.processWithChainOfThought(prompt, context, this.apiKey);
      enhancedPrompt = chainResult.enhancedPrompt;
      reasoning = chainResult.reasoning;
    } else {
      // Use standard enhancement for simple/moderate prompts
      enhancedPrompt = await this.standardEnhancement(prompt, context, options.isRefinement || false, model);
    }
    
    // Post-process the response
    enhancedPrompt = MistralResponseProcessor.processResponse(enhancedPrompt);
    
    // Evaluate if requested
    let evaluation: MistralEvaluation | undefined;
    let confidence: number | undefined;
    
    if (options.includeEvaluation) {
      evaluation = await MistralConfidenceScorer.evaluateEnhancement(prompt, enhancedPrompt, this.apiKey);
      confidence = evaluation.overall;
    }
    
    return {
      enhancedPrompt,
      source: 'mistral',
      confidence,
      reasoning,
      evaluation,
      metadata: {
        model,
        optimization: 'mistral-full-v1.0',
        processTime: Date.now() - startTime,
        complexity
      }
    };
  }
  
  private async standardEnhancement(
    prompt: string,
    context: string | undefined,
    isRefinement: boolean,
    model: string
  ): Promise<string> {
    // This would call the standard Mistral enhancement function
    // For now, return a placeholder that would be replaced with actual API call
    throw new Error('Standard enhancement method needs to be connected to main enhancement function');
  }
  
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    return MistralModelSelector['assessComplexity'](prompt);
  }
}