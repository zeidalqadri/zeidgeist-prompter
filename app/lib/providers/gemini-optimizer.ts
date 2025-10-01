/**
 * Google Gemini Optimization Utilities
 * Implements Gemini-specific features and best practices for prompt enhancement
 * Based on Google's official Gemini API documentation and prompting strategies
 */

// Gemini-specific configuration
export interface GeminiConfig {
  model: 'gemini-1.5-pro' | 'gemini-1.5-flash' | 'gemini-1.0-pro';
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
  stopSequences?: string[];
}

// Enhanced response interface with Gemini-specific features
export interface GeminiEnhancementResponse {
  enhancedPrompt: string;
  source: 'gemini';
  confidence?: number;
  reasoning?: string;
  evaluation?: GeminiEvaluation;
  metadata: {
    model: string;
    usage?: any;
    optimization: string;
    processTime: number;
    complexity: 'simple' | 'moderate' | 'complex';
    taskType?: string;
    finishReason?: string;
  };
}

// Evaluation structure for Gemini responses
export interface GeminiEvaluation {
  clarity: number;        // 1-10 scale
  specificity: number;    // 1-10 scale
  actionability: number;  // 1-10 scale
  completeness: number;   // 1-10 scale
  creativity: number;     // 1-10 scale (Gemini's strength)
  overall: number;        // 1-10 scale
  improvements: string[];
}

/**
 * Gemini Model Selector - chooses optimal model based on task complexity and requirements
 */
export class GeminiModelSelector {
  static selectModel(prompt: string, context?: string, requiresReasoning: boolean = false): GeminiConfig['model'] {
    const totalLength = prompt.length + (context?.length || 0);
    const complexity = this.assessComplexity(prompt);
    
    // Use Flash for simple, fast tasks
    if (complexity === 'simple' && totalLength < 500 && !requiresReasoning) {
      return 'gemini-1.5-flash';
    }
    
    // Use Pro for complex reasoning, analysis, and creative tasks
    if (complexity === 'complex' || requiresReasoning || this.requiresCreativity(prompt)) {
      return 'gemini-1.5-pro';
    }
    
    // Default to Pro for most enhancement tasks (best balance)
    return 'gemini-1.5-pro';
  }
  
  private static assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    // Simple: basic transformations, short prompts
    if (prompt.length < 100 && !this.hasComplexPatterns(prompt)) {
      return 'simple';
    }
    
    // Complex: multi-step reasoning, creative tasks, technical content
    if (prompt.length > 500 || this.hasComplexPatterns(prompt) || this.requiresCreativity(prompt)) {
      return 'complex';
    }
    
    return 'moderate';
  }
  
  private static hasComplexPatterns(prompt: string): boolean {
    const complexPatterns = [
      /\b(analysis|evaluation|comparison|synthesis|reasoning)\b/i,
      /\b(step-by-step|methodology|framework|strategy|approach)\b/i,
      /\b(requirements|specifications|criteria|constraints|standards)\b/i,
      /\b(technical|professional|academic|scientific|research)\b/i,
      /\b(multi-step|comprehensive|detailed|thorough|in-depth)\b/i,
      /[0-9]+\s*(steps|phases|sections|parts|components)/i
    ];
    
    return complexPatterns.some(pattern => pattern.test(prompt));
  }
  
  private static requiresCreativity(prompt: string): boolean {
    const creativePatterns = [
      /\b(creative|imaginative|innovative|brainstorm|ideate)\b/i,
      /\b(story|narrative|creative writing|poem|script)\b/i,
      /\b(design|create|generate|invent|develop)\b/i,
      /\b(alternative|multiple|various|different|diverse)\b/i,
      /\b(marketing|advertising|campaign|brand|content)\b/i
    ];
    
    return creativePatterns.some(pattern => pattern.test(prompt));
  }
}

/**
 * Gemini Few-Shot Learning Manager - creates contextual examples for better results
 */
export class GeminiFewShotManager {
  static buildFewShotExamples(taskType: string, isRefinement: boolean = false): string {
    const examples = this.getTaskExamples(taskType);
    
    if (isRefinement) {
      return this.buildRefinementExamples(examples);
    }
    
    return this.buildEnhancementExamples(examples);
  }
  
  private static getTaskExamples(taskType: string): { basic: string; enhanced: string }[] {
    const exampleSets = {
      analysis: [
        {
          basic: "analyze the market",
          enhanced: "Conduct a comprehensive market analysis including: competitive landscape assessment with key players and market share data, target audience segmentation with demographics and psychographics, pricing analysis across different segments, market trends and growth projections for the next 3-5 years, SWOT analysis of major competitors, regulatory environment impact, emerging technologies and disruptions, customer pain points and unmet needs, market entry barriers and opportunities, and actionable strategic recommendations with implementation timelines and resource requirements."
        },
        {
          basic: "study user behavior",
          enhanced: "Execute a detailed user behavior analysis incorporating: quantitative data collection through analytics tools, heatmaps, and user journey tracking; qualitative research via user interviews, surveys, and usability testing sessions; behavioral pattern identification including conversion funnels, drop-off points, and engagement metrics; user persona development with detailed profiles, motivations, and pain points; A/B testing recommendations for key interface elements; accessibility audit ensuring WCAG 2.1 compliance; mobile vs desktop behavior comparison; and actionable optimization strategies prioritized by impact and implementation difficulty."
        }
      ],
      creative: [
        {
          basic: "write creative content",
          enhanced: "Develop compelling creative content with: clear target audience definition and tone of voice guidelines, engaging hook that captures attention within the first 3 seconds, structured narrative flow with logical progression and emotional peaks, brand voice consistency aligned with company values and personality, visual content integration suggestions for maximum engagement, platform-specific optimization for different channels (social media, email, web), calls-to-action strategically placed throughout the content, SEO considerations with relevant keywords naturally integrated, performance metrics definition for measuring success, and content series potential for sustained audience engagement."
        },
        {
          basic: "brainstorm ideas",
          enhanced: "Conduct a structured ideation session featuring: diverse perspective gathering through cross-functional team involvement, systematic idea generation using proven techniques (SCAMPER, mind mapping, reverse brainstorming), feasibility assessment with resource requirements and technical constraints, market validation through competitive analysis and user research insights, innovation scoring matrix evaluating novelty, impact, and viability, risk assessment identifying potential challenges and mitigation strategies, implementation roadmap with phases, milestones, and success metrics, and follow-up action plan with assigned responsibilities and deadlines."
        }
      ],
      technical: [
        {
          basic: "build a system",
          enhanced: "Design and implement a comprehensive system architecture including: detailed requirements gathering through stakeholder interviews and user story development, technology stack selection with justification for each component choice, scalable database design with normalization, indexing strategy, and performance optimization, API architecture with RESTful endpoints, authentication, and rate limiting, security implementation featuring encryption, input validation, and vulnerability assessment, testing strategy encompassing unit tests, integration tests, and end-to-end testing, deployment pipeline with CI/CD automation, monitoring, and logging, documentation including technical specifications, user guides, and maintenance procedures, and post-deployment support plan with performance monitoring and iterative improvements."
        }
      ],
      business: [
        {
          basic: "create a strategy",
          enhanced: "Develop a comprehensive business strategy encompassing: market opportunity analysis with addressable market sizing and growth projections, competitive positioning framework highlighting unique value propositions and differentiation factors, revenue model design with multiple streams and pricing strategies, operational plan detailing resource requirements, processes, and key performance indicators, financial projections including revenue forecasts, cost structure analysis, and break-even timeline, risk assessment matrix identifying potential challenges with mitigation strategies, implementation roadmap with quarterly milestones and success metrics, stakeholder alignment plan ensuring buy-in across all levels, and performance tracking system with regular review cycles and adaptation mechanisms."
        }
      ]
    };
    
    // Return examples for the specific task type, or default to analysis examples
    return exampleSets[taskType as keyof typeof exampleSets] || exampleSets.analysis;
  }
  
  private static buildEnhancementExamples(examples: { basic: string; enhanced: string }[]): string {
    return examples.map((example, index) => 
      `Example ${index + 1}:\nBasic: "${example.basic}"\nEnhanced: "${example.enhanced}"`
    ).join('\n\n');
  }
  
  private static buildRefinementExamples(examples: { basic: string; enhanced: string }[]): string {
    // For refinement, show how to improve already-enhanced prompts
    return examples.map((example, index) => 
      `Refinement Example ${index + 1}:\nGood: "${example.enhanced}"\nRefined: "${example.enhanced} Additionally, include stakeholder feedback collection methods, post-implementation review processes, and continuous improvement mechanisms with quarterly optimization cycles."`
    ).join('\n\n');
  }
}

/**
 * Gemini Safety and Quality Controller - ensures appropriate content and response quality
 */
export class GeminiSafetyController {
  static buildSafetySettings(): any[] {
    return [
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
    ];
  }
  
  static validateResponse(response: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check for minimum length
    if (response.length < 50) {
      issues.push('Response too short - may be incomplete');
    }
    
    // Check for incomplete sentences
    if (!response.match(/[.!?]$/)) {
      issues.push('Response does not end with proper punctuation');
    }
    
    // Check for meta-text that shouldn't be there
    const metaPatterns = [
      /^(Here's|Here is|This is|Below is)/i,
      /I've (enhanced|improved|refined)/i,
      /The (enhanced|improved|refined) prompt/i
    ];
    
    if (metaPatterns.some(pattern => pattern.test(response))) {
      issues.push('Response contains unwanted meta-text or introductions');
    }
    
    // Check for adequate structure (enhanced prompts should have some structure)
    if (response.length > 200 && !this.hasStructuralElements(response)) {
      issues.push('Long response lacks structural elements (lists, sections, etc.)');
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  private static hasStructuralElements(text: string): boolean {
    const structuralPatterns = [
      /\d+\.\s/,           // Numbered lists
      /[•\-\*]\s/,         // Bullet points
      /:(?:\s|$)/,         // Colons (often used in structured content)
      /\n\s*\n/,           // Paragraph breaks
      /including:/i,       // Common structure indicator
      /such as:/i,         // Common structure indicator
      /specifically:/i     // Common structure indicator
    ];
    
    return structuralPatterns.some(pattern => pattern.test(text));
  }
}

/**
 * Gemini Confidence Evaluator - assesses enhancement quality using Gemini itself
 */
export class GeminiConfidenceEvaluator {
  static async evaluateEnhancement(
    originalPrompt: string,
    enhancedPrompt: string,
    apiKey: string
  ): Promise<GeminiEvaluation> {
    const evaluationPrompt = this.buildEvaluationPrompt(originalPrompt, enhancedPrompt);
    
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: evaluationPrompt }] }],
          generationConfig: {
            temperature: 0.1,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 1500
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Gemini evaluation failed: ${response.status}`);
      }
      
      const data = await response.json() as any;
      const evaluationText = data.candidates[0].content.parts[0].text;
      
      return this.parseEvaluationResponse(evaluationText);
    } catch (error) {
      console.warn('Gemini evaluation failed, using fallback scoring:', error);
      return this.fallbackEvaluation(originalPrompt, enhancedPrompt);
    }
  }
  
  private static buildEvaluationPrompt(original: string, enhanced: string): string {
    return `Evaluate the quality of this prompt enhancement by scoring each aspect from 1-10 and providing specific improvement suggestions.

ORIGINAL PROMPT:
${original}

ENHANCED PROMPT:
${enhanced}

Please provide scores (1-10) for:

CLARITY: How clear and understandable is the enhanced prompt?
SPECIFICITY: How specific and detailed are the requirements?
ACTIONABILITY: How actionable and executable are the instructions?
COMPLETENESS: How complete and comprehensive is the enhancement?
CREATIVITY: How creative and innovative is the approach? (Consider uniqueness, multiple perspectives, novel solutions)
OVERALL: Overall quality of the enhancement

IMPROVEMENTS: List 3 specific ways the prompt could be further improved.

Format your response exactly like this:
CLARITY: [score]
SPECIFICITY: [score]
ACTIONABILITY: [score]
COMPLETENESS: [score]
CREATIVITY: [score]
OVERALL: [score]
IMPROVEMENTS:
1. [improvement 1]
2. [improvement 2]
3. [improvement 3]`;
  }
  
  private static parseEvaluationResponse(response: string): GeminiEvaluation {
    const scores = {
      clarity: this.extractScore(response, 'CLARITY'),
      specificity: this.extractScore(response, 'SPECIFICITY'),
      actionability: this.extractScore(response, 'ACTIONABILITY'),
      completeness: this.extractScore(response, 'COMPLETENESS'),
      creativity: this.extractScore(response, 'CREATIVITY'),
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
    if (!improvementSection) {
      return ['Add more specific examples', 'Include success criteria', 'Enhance structural organization'];
    }
    
    const improvements = improvementSection
      .split('\n')
      .filter(line => /^\d+\./.test(line.trim()))
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
      .slice(0, 3); // Take first 3 improvements
    
    return improvements.length > 0 
      ? improvements 
      : ['Add more specific examples', 'Include success criteria', 'Enhance structural organization'];
  }
  
  private static fallbackEvaluation(original: string, enhanced: string): GeminiEvaluation {
    // Heuristic-based evaluation when API call fails
    const lengthRatio = enhanced.length / Math.max(original.length, 1);
    const hasStructure = /\d+\.|[•\-\*]\s|:/.test(enhanced);
    const hasExamples = /example|such as|for instance|including/i.test(enhanced);
    const hasConstraints = /must|should|require|ensure|include/i.test(enhanced);
    const hasCreativeElements = /innovative|creative|multiple|diverse|alternative/i.test(enhanced);
    
    const baseScore = 6.5;
    const lengthBonus = Math.min(lengthRatio * 1.5, 2); // Max 2 points for length
    const structureBonus = hasStructure ? 1 : 0;
    const exampleBonus = hasExamples ? 0.5 : 0;
    const constraintBonus = hasConstraints ? 0.5 : 0;
    const creativityBonus = hasCreativeElements ? 1 : 0;
    
    const score = Math.min(baseScore + lengthBonus + structureBonus + exampleBonus + constraintBonus, 10);
    const creativityScore = Math.min(baseScore + creativityBonus + structureBonus + exampleBonus, 10);
    
    return {
      clarity: score,
      specificity: score,
      actionability: score,
      completeness: score,
      creativity: creativityScore,
      overall: score,
      improvements: [
        'Add more specific examples and use cases',
        'Include measurable success criteria and quality standards', 
        'Enhance creative aspects with multiple perspectives and innovative approaches'
      ]
    };
  }
}

/**
 * Main Gemini Optimizer - orchestrates all optimizations
 */
export class GeminiOptimizer {
  private apiKey: string;
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }
  
  async enhanceWithFullOptimization(
    prompt: string,
    context?: string,
    options: {
      taskType?: string;
      includeEvaluation?: boolean;
      isRefinement?: boolean;
      requiresCreativity?: boolean;
    } = {}
  ): Promise<GeminiEnhancementResponse> {
    const startTime = Date.now();
    
    // Select optimal model
    const model = GeminiModelSelector.selectModel(
      prompt, 
      context, 
      options.requiresCreativity || options.taskType === 'analysis'
    );
    
    const complexity = this.assessComplexity(prompt);
    
    // Build optimized prompt with few-shot learning
    const systemInstruction = this.buildOptimizedSystemInstruction(options);
    const userContent = this.buildOptimizedUserContent(prompt, context, options);
    
    // Configure generation parameters
    const generationConfig = this.getOptimalGenerationConfig(complexity, options);
    
    // Make API call
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`, {
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
      const error = await response.json() as any;
      throw new Error(`Gemini API error: ${JSON.stringify(error)}`);
    }
    
    const data = await response.json() as any;
    
    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      throw new Error('Gemini API returned no content');
    }
    
    let enhancedPrompt = data.candidates[0].content.parts[0].text;
    
    // Quality validation and cleanup
    const validation = GeminiSafetyController.validateResponse(enhancedPrompt);
    if (!validation.isValid) {
      console.warn('Gemini response quality issues:', validation.issues);
    }
    
    // Post-process response
    enhancedPrompt = this.postProcessResponse(enhancedPrompt);
    
    // Evaluate if requested
    let evaluation: GeminiEvaluation | undefined;
    let confidence: number | undefined;
    
    if (options.includeEvaluation) {
      evaluation = await GeminiConfidenceEvaluator.evaluateEnhancement(prompt, enhancedPrompt, this.apiKey);
      confidence = evaluation.overall;
    }
    
    return {
      enhancedPrompt,
      source: 'gemini',
      confidence,
      evaluation,
      metadata: {
        model,
        usage: data.usageMetadata,
        optimization: 'gemini-optimized-v1.0',
        processTime: Date.now() - startTime,
        complexity,
        taskType: options.taskType,
        finishReason: data.candidates[0].finishReason
      }
    };
  }
  
  private buildOptimizedSystemInstruction(options: any): string {
    const taskType = options.taskType || 'general';
    const isRefinement = options.isRefinement || false;
    
    let baseInstruction = isRefinement 
      ? `You are an expert prompt refinement specialist. Your task is to refine already-enhanced prompts by adding missing details, improving clarity, and strengthening specifications.`
      : `You are an expert prompt enhancement specialist. Transform basic prompts into comprehensive, actionable instructions that deliver exceptional results.`;
    
    baseInstruction += `\n\nKey principles:\n1. Output ONLY the ${isRefinement ? 'refined' : 'enhanced'} prompt text\n2. No introductions, explanations, or meta-text\n3. Be specific, actionable, and comprehensive\n4. Include relevant examples and success criteria\n5. Structure content clearly with appropriate formatting`;
    
    if (options.requiresCreativity || taskType === 'creative') {
      baseInstruction += `\n6. Incorporate creative and innovative approaches\n7. Consider multiple perspectives and alternative solutions`;
    }
    
    // Add few-shot examples
    const examples = GeminiFewShotManager.buildFewShotExamples(taskType, isRefinement);
    baseInstruction += `\n\nExample transformations:\n${examples}`;
    
    return baseInstruction;
  }
  
  private buildOptimizedUserContent(prompt: string, context: string | undefined, options: any): string {
    let content = `Task: ${options.isRefinement ? 'REFINE' : 'ENHANCE'} the following prompt\n\n`;
    
    if (context && context.trim()) {
      content += `Context: ${context}\n\n`;
    }
    
    content += `Prompt to ${options.isRefinement ? 'refine' : 'enhance'}: ${prompt}\n\n`;
    
    if (options.taskType) {
      content += `Task type: ${options.taskType}\n\n`;
    }
    
    content += `Provide only the ${options.isRefinement ? 'refined' : 'enhanced'} prompt text. Do not include introductions, explanations, or meta-text.`;
    
    return content;
  }
  
  private getOptimalGenerationConfig(complexity: string, options: any): any {
    const baseConfig = {
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 8192,
      stopSequences: []
    };
    
    // Adjust temperature based on task requirements
    if (options.requiresCreativity || options.taskType === 'creative') {
      return { ...baseConfig, temperature: 0.4 }; // Higher for creativity
    }
    
    if (complexity === 'simple') {
      return { ...baseConfig, temperature: 0.1, maxOutputTokens: 4096 }; // Lower for precision
    }
    
    return { ...baseConfig, temperature: 0.2 }; // Balanced default
  }
  
  private postProcessResponse(response: string): string {
    let cleaned = response.trim();
    
    // Remove meta-text patterns
    const metaPatterns = [
      /^(Here's the|Here is the)\s+(enhanced|refined|improved)\s+prompt:?\s*/i,
      /^(The|This)\s+(enhanced|refined|improved)\s+prompt\s+is:?\s*/i,
      /^(Enhanced|Refined|Improved)\s+prompt:?\s*/i,
      /^\*\*(Enhanced|Refined|Improved)\s+Prompt\*\*:?\s*/i
    ];
    
    metaPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
    
    // Remove markdown artifacts
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
    cleaned = cleaned.replace(/^---\n?/, '').replace(/\n?---$/, '');
    
    // Normalize formatting
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n /g, '\n')
      .trim();
    
    // Ensure quality standards
    if (cleaned.length < 50) {
      cleaned += '. Include comprehensive details, clear structure, and specific requirements for optimal results.';
    }
    
    if (!cleaned.match(/[.!?]$/)) {
      cleaned += '.';
    }
    
    return cleaned;
  }
  
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    return GeminiModelSelector['assessComplexity'](prompt);
  }
}