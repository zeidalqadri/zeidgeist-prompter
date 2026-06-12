/**
 * Advanced Prompt Management System
 * Implements centralized management, testing, and optimization
 */

import { SystemPrompt, PROMPT_COLLECTION } from './enhanced-system-prompts';

/**
 * Context Management System
 * Optimizes context window usage and relevance
 */
export class ContextManager {
  private readonly maxTokens: number;

  constructor(maxTokens: number = 4096) {
    this.maxTokens = maxTokens;
  }

  /**
   * Compress context to fit within token limits
   */
  compress(context: string, maxTokens: number): string {
    // Simple token estimation (4 chars ≈ 1 token)
    const estimatedTokens = context.length / 4;

    if (estimatedTokens <= maxTokens) {
      return context;
    }

    // Compression strategies
    const strategies = [
      this.removeRedundancy,
      this.summarizeVerbose,
      this.extractKeyPoints,
      this.truncateIntelligently
    ];

    let compressed = context;
    for (const strategy of strategies) {
      compressed = strategy(compressed);
      if (this.estimateTokens(compressed) <= maxTokens) {
        break;
      }
    }

    return compressed;
  }

  /**
   * Prioritize multiple contexts by relevance
   */
  prioritize(contexts: Array<{content: string, weight: number}>): string {
    // Sort by weight
    const sorted = contexts.sort((a, b) => b.weight - a.weight);

    let result = '';
    let tokensUsed = 0;

    for (const ctx of sorted) {
      const tokens = this.estimateTokens(ctx.content);
      if (tokensUsed + tokens <= this.maxTokens) {
        result += ctx.content + '\n\n';
        tokensUsed += tokens;
      } else {
        // Try to fit partial context
        const remaining = this.maxTokens - tokensUsed;
        if (remaining > 100) {
          const compressed = this.compress(ctx.content, remaining);
          result += compressed;
          break;
        }
      }
    }

    return result.trim();
  }

  /**
   * Chunk long context into manageable pieces
   */
  chunk(longContext: string, chunkSize: number = 1000): string[] {
    const chunks: string[] = [];
    const sentences = longContext.split(/(?<=[.!?])\s+/);

    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokens + sentenceTokens <= chunkSize) {
        currentChunk += sentence + ' ';
        currentTokens += sentenceTokens;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence + ' ';
        currentTokens = sentenceTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Merge chunks back into coherent context
   */
  merge(chunks: string[], separator: string = '\n\n'): string {
    return chunks.join(separator);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: 4 characters ≈ 1 token
    return Math.ceil(text.length / 4);
  }

  private removeRedundancy(text: string): string {
    // Remove duplicate sentences
    const sentences = text.split(/(?<=[.!?])\s+/);
    const unique = [...new Set(sentences)];
    return unique.join(' ');
  }

  private summarizeVerbose(text: string): string {
    // Replace verbose phrases with concise alternatives
    const replacements = [
      [/in order to/g, 'to'],
      [/at the present time/g, 'now'],
      [/in the event that/g, 'if'],
      [/due to the fact that/g, 'because'],
      [/in spite of the fact that/g, 'although']
    ];

    let compressed = text;
    for (const [pattern, replacement] of replacements) {
      compressed = compressed.replace(pattern, replacement as string);
    }

    return compressed;
  }

  private extractKeyPoints(text: string): string {
    // Extract sentences with key indicators
    const keyIndicators = [
      'important', 'critical', 'essential', 'must', 'required',
      'key', 'main', 'primary', 'significant', 'vital'
    ];

    const sentences = text.split(/(?<=[.!?])\s+/);
    const keysentences = sentences.filter(s =>
      keyIndicators.some(indicator =>
        s.toLowerCase().includes(indicator)
      )
    );

    return keysentences.length > 0 ? keysentences.join(' ') : text;
  }

  private truncateIntelligently(text: string): string {
    // Keep beginning and end, summarize middle
    const tokens = this.estimateTokens(text);
    if (tokens <= this.maxTokens) return text;

    const sentences = text.split(/(?<=[.!?])\s+/);
    const keepStart = Math.floor(sentences.length * 0.3);
    const keepEnd = Math.floor(sentences.length * 0.2);

    const start = sentences.slice(0, keepStart).join(' ');
    const end = sentences.slice(-keepEnd).join(' ');

    return `${start}\n\n[... content summarized ...]\n\n${end}`;
  }
}

/**
 * Multi-Stage Enhancement Pipeline
 */
export interface EnhancementStage {
  name: string;
  enhance: (prompt: string) => Promise<string>;
  validate: (prompt: string) => boolean;
  fallback: (originalPrompt: string) => string;
}

export class EnhancementPipeline {
  private stages: EnhancementStage[] = [];

  addStage(stage: EnhancementStage): void {
    this.stages.push(stage);
  }

  async process(prompt: string): Promise<{
    enhanced: string;
    stages: Array<{name: string; success: boolean; output: string}>
  }> {
    let current = prompt;
    const stageResults = [];

    for (const stage of this.stages) {
      try {
        const enhanced = await stage.enhance(current);
        const valid = stage.validate(enhanced);

        if (valid) {
          current = enhanced;
          stageResults.push({
            name: stage.name,
            success: true,
            output: enhanced
          });
        } else {
          current = stage.fallback(current);
          stageResults.push({
            name: stage.name,
            success: false,
            output: current
          });
        }
      } catch (error) {
        current = stage.fallback(current);
        stageResults.push({
          name: stage.name,
          success: false,
          output: current
        });
      }
    }

    return {
      enhanced: current,
      stages: stageResults
    };
  }
}

/**
 * Quality Metrics Calculator
 */
export interface QualityMetrics {
  clarity: number;        // Flesch reading ease adapted for prompts
  specificity: number;    // Density of specific terms and numbers
  completeness: number;   // Coverage of expected elements
  structure: number;      // Organization and formatting score
  actionability: number;  // Presence of clear directives
  overall: number;        // Weighted average
}

export class MetricsCalculator {
  /**
   * Calculate quality metrics for a prompt
   */
  calculate(prompt: string): QualityMetrics {
    return {
      clarity: this.calculateClarity(prompt),
      specificity: this.calculateSpecificity(prompt),
      completeness: this.calculateCompleteness(prompt),
      structure: this.calculateStructure(prompt),
      actionability: this.calculateActionability(prompt),
      overall: 0 // Will be calculated after
    };
  }

  /**
   * Compare before and after enhancement
   */
  compare(before: string, after: string): {
    improvement: number;
    metrics: {
      before: QualityMetrics;
      after: QualityMetrics;
      delta: QualityMetrics;
    }
  } {
    const beforeMetrics = this.calculate(before);
    const afterMetrics = this.calculate(after);

    const delta: QualityMetrics = {
      clarity: afterMetrics.clarity - beforeMetrics.clarity,
      specificity: afterMetrics.specificity - beforeMetrics.specificity,
      completeness: afterMetrics.completeness - beforeMetrics.completeness,
      structure: afterMetrics.structure - beforeMetrics.structure,
      actionability: afterMetrics.actionability - beforeMetrics.actionability,
      overall: 0
    };

    // Calculate overall scores
    beforeMetrics.overall = this.calculateOverall(beforeMetrics);
    afterMetrics.overall = this.calculateOverall(afterMetrics);
    delta.overall = afterMetrics.overall - beforeMetrics.overall;

    return {
      improvement: delta.overall,
      metrics: {
        before: beforeMetrics,
        after: afterMetrics,
        delta
      }
    };
  }

  /**
   * Check if metrics meet quality threshold
   */
  meetsThreshold(metrics: QualityMetrics, threshold: number = 70): boolean {
    return metrics.overall >= threshold;
  }

  private calculateClarity(text: string): number {
    // Simplified clarity score based on sentence length and complexity
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return 0;

    const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
    const complexWords = text.match(/\b\w{10,}\b/g)?.length || 0;
    const totalWords = text.split(/\s+/).length;
    const complexityRatio = complexWords / totalWords;

    // Ideal sentence length is 15-20 words
    const sentenceLengthScore = avgSentenceLength <= 20 ? 100 : Math.max(0, 100 - (avgSentenceLength - 20) * 2);
    const complexityScore = Math.max(0, 100 - complexityRatio * 200);

    return Math.round((sentenceLengthScore + complexityScore) / 2);
  }

  private calculateSpecificity(text: string): number {
    const specificIndicators = [
      /\d+/g,                           // Numbers
      /\b(must|should|will|shall)\b/gi, // Modal verbs
      /\b(exactly|precisely|specifically)\b/gi, // Precision words
      /\[[^\]]+\]/g,                    // Bracketed specifications
      /"[^"]+"/g,                       // Quoted terms
      /\b[A-Z]{2,}\b/g                  // Acronyms
    ];

    let score = 0;
    const wordCount = text.split(/\s+/).length;

    for (const indicator of specificIndicators) {
      const matches = text.match(indicator)?.length || 0;
      score += matches;
    }

    // Normalize by word count (specific elements per 100 words)
    const normalizedScore = (score / wordCount) * 100;
    return Math.min(100, Math.round(normalizedScore * 10));
  }

  private calculateCompleteness(text: string): number {
    const expectedElements = [
      /objective|goal|purpose/i,
      /requirement|constraint/i,
      /output|result|deliverable/i,
      /format|structure/i,
      /example|instance/i,
      /step|process|method/i
    ];

    let present = 0;
    for (const element of expectedElements) {
      if (element.test(text)) present++;
    }

    return Math.round((present / expectedElements.length) * 100);
  }

  private calculateStructure(text: string): number {
    let score = 0;

    // Check for numbered lists
    if (/\d+\.\s/m.test(text)) score += 25;

    // Check for bullet points
    if (/^[\-\*•]\s/m.test(text)) score += 20;

    // Check for sections/headers
    if (/^#{1,3}\s/m.test(text) || /^[A-Z][^.!?]*:$/m.test(text)) score += 25;

    // Check for proper paragraphing
    const paragraphs = text.split(/\n\n+/).length;
    if (paragraphs > 1) score += 15;

    // Check for consistent formatting
    const lines = text.split('\n');
    const indentedLines = lines.filter(l => /^\s{2,}/.test(l)).length;
    if (indentedLines > 0 && indentedLines < lines.length) score += 15;

    return Math.min(100, score);
  }

  private calculateActionability(text: string): number {
    const actionIndicators = [
      /\b(create|build|develop|implement|design|write|analyze|evaluate)\b/gi,
      /\b(include|add|provide|ensure|specify|define)\b/gi,
      /\b(step \d+|first|then|next|finally)\b/gi,
      /\b(must|should|need to|required to)\b/gi
    ];

    let score = 0;
    for (const indicator of actionIndicators) {
      const matches = text.match(indicator)?.length || 0;
      score += Math.min(25, matches * 5);
    }

    return Math.min(100, score);
  }

  private calculateOverall(metrics: Omit<QualityMetrics, 'overall'>): number {
    // Weighted average with emphasis on specificity and actionability
    const weights = {
      clarity: 0.15,
      specificity: 0.3,
      completeness: 0.2,
      structure: 0.15,
      actionability: 0.2
    };

    return Math.round(
      metrics.clarity * weights.clarity +
      metrics.specificity * weights.specificity +
      metrics.completeness * weights.completeness +
      metrics.structure * weights.structure +
      metrics.actionability * weights.actionability
    );
  }
}

/**
 * Prompt Testing Framework
 */
export interface PromptTest {
  name: string;
  description: string;
  input: string;
  expectations: {
    minLength?: number;
    maxLength?: number;
    requiredPatterns?: RegExp[];
    forbiddenPatterns?: RegExp[];
    minQualityScore?: number;
    requiredSections?: string[];
  };
}

export class PromptTestRunner {
  private tests: PromptTest[] = [];
  private metricsCalculator = new MetricsCalculator();

  addTest(test: PromptTest): void {
    this.tests.push(test);
  }

  async runTest(test: PromptTest, enhancedPrompt: string): Promise<{
    passed: boolean;
    results: Array<{check: string; passed: boolean; details: string}>;
  }> {
    const results = [];

    // Length checks
    if (test.expectations.minLength) {
      const passed = enhancedPrompt.length >= test.expectations.minLength;
      results.push({
        check: 'Minimum length',
        passed,
        details: `Expected >= ${test.expectations.minLength}, got ${enhancedPrompt.length}`
      });
    }

    if (test.expectations.maxLength) {
      const passed = enhancedPrompt.length <= test.expectations.maxLength;
      results.push({
        check: 'Maximum length',
        passed,
        details: `Expected <= ${test.expectations.maxLength}, got ${enhancedPrompt.length}`
      });
    }

    // Pattern checks
    if (test.expectations.requiredPatterns) {
      for (const pattern of test.expectations.requiredPatterns) {
        const passed = pattern.test(enhancedPrompt);
        results.push({
          check: `Required pattern: ${pattern}`,
          passed,
          details: passed ? 'Pattern found' : 'Pattern not found'
        });
      }
    }

    if (test.expectations.forbiddenPatterns) {
      for (const pattern of test.expectations.forbiddenPatterns) {
        const passed = !pattern.test(enhancedPrompt);
        results.push({
          check: `Forbidden pattern: ${pattern}`,
          passed,
          details: passed ? 'Pattern not found' : 'Pattern found (should not be present)'
        });
      }
    }

    // Quality score check
    if (test.expectations.minQualityScore) {
      const metrics = this.metricsCalculator.calculate(enhancedPrompt);
      const passed = metrics.overall >= test.expectations.minQualityScore;
      results.push({
        check: 'Quality score',
        passed,
        details: `Expected >= ${test.expectations.minQualityScore}, got ${metrics.overall}`
      });
    }

    // Section checks
    if (test.expectations.requiredSections) {
      for (const section of test.expectations.requiredSections) {
        const passed = enhancedPrompt.toLowerCase().includes(section.toLowerCase());
        results.push({
          check: `Required section: ${section}`,
          passed,
          details: passed ? 'Section found' : 'Section not found'
        });
      }
    }

    const allPassed = results.every(r => r.passed);

    return {
      passed: allPassed,
      results
    };
  }

  async runAllTests(enhancedPrompt: string): Promise<{
    passed: boolean;
    testResults: Array<{
      test: string;
      passed: boolean;
      results: Array<{check: string; passed: boolean; details: string}>;
    }>;
  }> {
    const testResults = [];

    for (const test of this.tests) {
      const result = await this.runTest(test, enhancedPrompt);
      testResults.push({
        test: test.name,
        passed: result.passed,
        results: result.results
      });
    }

    return {
      passed: testResults.every(t => t.passed),
      testResults
    };
  }
}

/**
 * Self-Consistency Validator
 */
export class SelfConsistencyValidator {
  async generateVariations(
    prompt: string,
    count: number = 3,
    temperatures: number[] = [0.3, 0.5, 0.7]
  ): Promise<string[]> {
    // This would integrate with the LLM to generate variations
    // For now, returning placeholder
    return [prompt];
  }

  selectBest(
    variations: string[],
    method: 'majority' | 'scoring' | 'ensemble' = 'scoring'
  ): string {
    if (method === 'scoring') {
      const calculator = new MetricsCalculator();
      let bestScore = -1;
      let bestVariation = variations[0];

      for (const variation of variations) {
        const metrics = calculator.calculate(variation);
        if (metrics.overall > bestScore) {
          bestScore = metrics.overall;
          bestVariation = variation;
        }
      }

      return bestVariation;
    }

    // For other methods, return first variation as placeholder
    return variations[0];
  }
}

/**
 * Central Prompt Manager
 */
export class PromptManager {
  private contextManager = new ContextManager();
  private metricsCalculator = new MetricsCalculator();
  private testRunner = new PromptTestRunner();
  private consistencyValidator = new SelfConsistencyValidator();
  private pipeline = new EnhancementPipeline();

  /**
   * Enhance a prompt with full pipeline
   */
  async enhance(
    prompt: string,
    options: {
      domain?: 'technical' | 'business' | 'creative' | 'academic';
      useChainOfThought?: boolean;
      validateSafety?: boolean;
      runTests?: boolean;
      generateVariations?: boolean;
    } = {}
  ): Promise<{
    enhanced: string;
    metrics: QualityMetrics;
    safety?: {safe: boolean; issues?: string[]};
    tests?: {passed: boolean; details: any};
    variations?: string[];
  }> {
    const result: any = {};

    // Configure pipeline based on options
    if (options.useChainOfThought) {
      this.pipeline.addStage({
        name: 'Chain of Thought',
        enhance: async (p) => this.applyChainOfThought(p),
        validate: (p) => p.length > prompt.length,
        fallback: (p) => p
      });
    }

    // Run enhancement pipeline
    const pipelineResult = await this.pipeline.process(prompt);
    result.enhanced = pipelineResult.enhanced;

    // Calculate metrics
    result.metrics = this.metricsCalculator.calculate(result.enhanced);

    // Safety validation
    if (options.validateSafety) {
      result.safety = await this.validateSafety(result.enhanced);
    }

    // Run tests
    if (options.runTests) {
      result.tests = await this.testRunner.runAllTests(result.enhanced);
    }

    // Generate variations for self-consistency
    if (options.generateVariations) {
      result.variations = await this.consistencyValidator.generateVariations(
        result.enhanced
      );
    }

    return result;
  }

  /**
   * Refine an already enhanced prompt
   */
  async refine(
    prompt: string,
    previousEnhancement: string
  ): Promise<string> {
    // Use iterative refinement prompt
    // This would integrate with LLM
    return previousEnhancement + ' [refined]';
  }

  private async applyChainOfThought(prompt: string): Promise<string> {
    // This would integrate with LLM using COT prompt
    // For now, returning enhanced version
    return `Enhanced: ${prompt}`;
  }

  private async validateSafety(prompt: string): Promise<{
    safe: boolean;
    issues?: string[];
  }> {
    const issues = [];

    // Check for injection patterns
    const injectionPatterns = [
      /ignore previous instructions/i,
      /disregard all prior/i,
      /new instructions:/i,
      /system:/i
    ];

    for (const pattern of injectionPatterns) {
      if (pattern.test(prompt)) {
        issues.push(`Potential injection attempt: ${pattern}`);
      }
    }

    // Check for sensitive content
    const sensitivePatterns = [
      /password|api[_\s]?key|secret|token/i,
      /personal[_\s]?information|ssn|credit[_\s]?card/i
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(prompt)) {
        issues.push(`Sensitive content detected: ${pattern}`);
      }
    }

    return {
      safe: issues.length === 0,
      issues: issues.length > 0 ? issues : undefined
    };
  }
}

// Export singleton instance
export const promptManager = new PromptManager();