// Prompt Enhancer v2: Using supervised learning from examples
// This approach learns patterns from high-quality examples rather than using rigid rules

import { trainingExamples, extractedPatterns, TrainingExample, PromptPattern } from './training-data';

// Interface for tracking domain-specific enhancement patterns
interface EnhancementPattern {
  domain: string
  patterns: string[]
  keywords: string[]
  templates: Array<{
    input: string
    context?: string
    output: string
  }>
}

// Interface for similarity-scored examples
interface ScoredExample {
  example: TrainingExample
  similarity: number
}

// Interface for extracting patterns from prompt templates
interface ExtractedSyntacticPattern {
  pattern: PromptPattern
  relevanceScore: number
}

// Cache user feedback for continuous improvement
interface FeedbackEntry {
  rawPrompt: string
  context?: string
  enhancedPrompt: string
  wasSuccessful: boolean
  feedback?: string
  timestamp: Date
}

// Storage for learning from feedback
const feedbackHistory: FeedbackEntry[] = [];

// Extract enhancement patterns from our training data
const domainPatterns: EnhancementPattern[] = extractPatternsFromExamples(trainingExamples);

/**
 * Extract common patterns from training examples grouped by domain
 */
function extractPatternsFromExamples(examples: TrainingExample[]): EnhancementPattern[] {
  // Group examples by domain
  const domainGroups: Record<string, TrainingExample[]> = {};
  
  for (const example of examples) {
    if (!domainGroups[example.domain]) {
      domainGroups[example.domain] = [];
    }
    
    domainGroups[example.domain].push(example);
  }
  
  // Extract patterns for each domain
  const patterns: EnhancementPattern[] = [];
  
  for (const domain of Object.keys(domainGroups)) {
    const domainExamples = domainGroups[domain];
    const keywords = extractKeywords(domainExamples);
    const commonPatterns = extractCommonPatterns(domainExamples);
    
    patterns.push({
      domain,
      patterns: commonPatterns,
      keywords,
      templates: domainExamples.map(ex => ({
        input: ex.rawPrompt,
        context: ex.context,
        output: ex.enhancedPrompt
      }))
    });
  }
  
  return patterns;
}

/**
 * Extract common keywords from a set of examples
 */
function extractKeywords(examples: TrainingExample[]): string[] {
  // Collect all words from all prompts and enhanced outputs
  const allWords = examples.flatMap(ex => {
    const promptWords = ex.rawPrompt.toLowerCase().split(/\s+/);
    const outputWords = ex.enhancedPrompt.toLowerCase().split(/\s+/);
    const contextWords = ex.context ? ex.context.toLowerCase().split(/\s+/) : [];
    
    return [...promptWords, ...outputWords, ...contextWords];
  });
  
  // Count word frequencies
  const wordCounts: Record<string, number> = {};
  
  for (const word of allWords) {
    // Skip very short words and common stopwords
    if (word.length <= 3 || isStopword(word)) continue;
    
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  }
  
  // Get words that appear frequently but not too frequently (domain-specific terms)
  const keywords = Object.entries(wordCounts)
    .filter(([_, count]) => count >= 2 && count < examples.length * 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
    
  return keywords;
}

/**
 * Check if a word is a common stopword
 */
function isStopword(word: string): boolean {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'are', 'not', 'from', 'has',
    'have', 'about', 'but', 'been', 'they', 'their', 'its', 'his', 'her', 'your'
  ]);
  
  return stopwords.has(word);
}

/**
 * Extract common patterns from examples in how they enhance prompts
 */
function extractCommonPatterns(examples: TrainingExample[]): string[] {
  // Look for common phrases in enhanced outputs that aren't in the raw prompts
  const addedPhrases: string[] = [];
  
  for (const example of examples) {
    // Find phrases in the output that aren't in the input
    const inputWords = new Set([
      ...example.rawPrompt.toLowerCase().split(/\s+/),
      ...(example.context ? example.context.toLowerCase().split(/\s+/) : [])
    ]);
    
    // Extract enhanced phrases (sentences or sentence fragments)
    const enhancedSentences = example.enhancedPrompt.split(/[.!?]/).map(s => s.trim()).filter(s => s);
    
    for (const sentence of enhancedSentences) {
      // Count how many words in this sentence aren't in the input
      const sentenceWords = sentence.toLowerCase().split(/\s+/);
      const newWordCount = sentenceWords.filter(word => !inputWords.has(word) && word.length > 3).length;
      
      // If this sentence adds substantial new content, add it as a pattern
      if (newWordCount >= 3 && sentence.length >= 20) {
        addedPhrases.push(sentence);
      }
    }
  }
  
  // Remove duplicates and very similar phrases
  const uniquePhrases: string[] = [];
  for (const phrase of addedPhrases) {
    let isDuplicate = false;
    for (const existing of uniquePhrases) {
      if (calculateSimilarity(phrase, existing) > 0.6) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniquePhrases.push(phrase);
    }
  }
  
  return uniquePhrases;
}

/**
 * Calculate similarity between two pieces of text (0-1 scale)
 */
function calculateSimilarity(text1: string, text2: string): number {
  // Normalize and tokenize texts
  const tokens1 = text1.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  const tokens2 = text2.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  
  if (tokens1.length === 0 || tokens2.length === 0) return 0;
  
  // Count shared tokens
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  
  let sharedCount = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      sharedCount++;
    }
  }
  
  // Jaccard similarity
  const union = set1.size + set2.size - sharedCount;
  return sharedCount / union;
}

/**
 * Find the most relevant examples for a given prompt and context
 */
function findRelevantExamples(rawPrompt: string, context?: string): ScoredExample[] {
  // Score each example by relevance to the current prompt
  const scoredExamples: ScoredExample[] = [];
  
  for (const example of trainingExamples) {
    // Calculate similarity between raw prompts
    const promptSimilarity = calculateSimilarity(rawPrompt, example.rawPrompt);
    
    // Calculate context similarity if both have context
    let contextSimilarity = 0;
    if (context && example.context) {
      contextSimilarity = calculateSimilarity(context, example.context);
    } else if (!context && !example.context) {
      contextSimilarity = 1; // Both have no context = perfect match
    }
    
    // Weighted combined score (prompt similarity is more important)
    const combinedSimilarity = (promptSimilarity * 0.7) + (contextSimilarity * 0.3);
    
    scoredExamples.push({
      example,
      similarity: combinedSimilarity
    });
  }
  
  // Sort by similarity (highest first) and take top results
  return scoredExamples
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3);
}

/**
 * Find the most relevant prompt patterns from our extracted templates
 */
function findRelevantPromptPatterns(rawPrompt: string, context?: string, domain?: string): ExtractedSyntacticPattern[] {
  const combinedText = `${rawPrompt} ${context || ''}`.toLowerCase();
  const scoredPatterns: ExtractedSyntacticPattern[] = [];
  
  for (const pattern of extractedPatterns) {
    let score = 0;
    
    // Check domain relevance
    if (domain && pattern.domain === domain) {
      score += 2;
    }
    
    // Check keyword matches
    for (const example of pattern.examples) {
      const lowerExample = example.toLowerCase();
      // If combinedText contains keywords from the pattern examples
      if (pattern.template.toLowerCase().split(/\s+/)
          .filter(word => word.length > 4)
          .some(word => combinedText.includes(word))) {
        score += 1;
      }
      
      // If the prompt seems to be asking for a similar type of content
      const patternWords = lowerExample.split(/\s+/).filter(w => w.length > 4);
      const promptWords = combinedText.split(/\s+/).filter(w => w.length > 4);
      
      const sharedWords = patternWords.filter(w => promptWords.includes(w));
      if (sharedWords.length > 0) {
        score += sharedWords.length / Math.min(patternWords.length, promptWords.length);
      }
    }
    
    scoredPatterns.push({
      pattern,
      relevanceScore: score
    });
  }
  
  // Sort by score and take top results
  return scoredPatterns
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .filter(p => p.relevanceScore > 0.2)
    .slice(0, 2);
}

/**
 * Identify which domain best matches the prompt
 */
function identifyDomain(rawPrompt: string, context?: string): string {
  const combinedText = `${rawPrompt} ${context || ''}`.toLowerCase();
  
  // Check each domain's keywords for matches
  const domainScores: Record<string, number> = {};
  
  for (const domainPattern of domainPatterns) {
    let score = 0;
    
    // Check for domain keywords
    for (const keyword of domainPattern.keywords) {
      if (combinedText.includes(keyword)) {
        score += 1;
      }
    }
    
    domainScores[domainPattern.domain] = score;
  }
  
  // Check prompt specific domains
  if (combinedText.includes("prompt") || 
      combinedText.includes("instruction") || 
      combinedText.includes("agent")) {
    domainScores["prompting"] = (domainScores["prompting"] || 0) + 3;
  }
  
  // Find domain with highest score
  let bestDomain = 'general';
  let highestScore = 0;
  
  for (const [domain, score] of Object.entries(domainScores)) {
    if (score > highestScore) {
      highestScore = score;
      bestDomain = domain;
    }
  }
  
  return bestDomain;
}

/**
 * Find enhancement patterns for a specific domain
 */
function getEnhancementPatternsForDomain(domain: string): EnhancementPattern | null {
  return domainPatterns.find(pattern => pattern.domain === domain) || null;
}

/**
 * Blend elements from examples with the original prompt
 */
function blendExampleWithPrompt(
  rawPrompt: string, 
  context: string | undefined, 
  example: TrainingExample
): string {
  // Start with the raw prompt
  let enhancedPrompt = rawPrompt.trim();
  
  // Extract any domain-specific elements from the example
  const exampleOutput = example.enhancedPrompt;
  
  // Add context if it exists and isn't already mentioned
  if (context && !enhancedPrompt.toLowerCase().includes(context.toLowerCase())) {
    // Find good places to insert context information
    const contextInfo = formatContext(context, enhancedPrompt);
    
    if (contextInfo) {
      // Check where to add the context - beginning is usually best
      if (enhancedPrompt.startsWith('Create') || 
          enhancedPrompt.startsWith('Build') || 
          enhancedPrompt.startsWith('Design') ||
          enhancedPrompt.startsWith('Write')) {
        // Add after the first word
        const words = enhancedPrompt.split(' ');
        words[1] = `${contextInfo} ${words[1]}`;
        enhancedPrompt = words.join(' ');
      } else {
        // Add at the beginning
        enhancedPrompt = `${contextInfo}. ${enhancedPrompt}`;
      }
    }
  }
  
  // Find common enhancing phrases from example that could improve our prompt
  const exampleSentences = exampleOutput.split('.').map(s => s.trim()).filter(s => s);
  const enhancingPhrases = exampleSentences.filter(sentence => 
    !sentence.toLowerCase().includes(example.rawPrompt.toLowerCase()) &&
    sentence.length > 20
  );
  
  // Add the most relevant enhancing phrase
  if (enhancingPhrases.length > 0) {
    // Check if we already have similar instructions
    const alreadyHasInstructions = enhancedPrompt.includes('Include') || 
                                  enhancedPrompt.includes('section') ||
                                  enhancedPrompt.length > rawPrompt.length + 50;
    
    if (!alreadyHasInstructions) {
      enhancedPrompt += `. ${enhancingPhrases[0]}`;
    }
  }
  
  return enhancedPrompt;
}

/**
 * Add structural elements from prompt templates to enhance the prompt
 */
function applyPromptPatterns(
  prompt: string,
  relevantPatterns: ExtractedSyntacticPattern[]
): string {
  if (relevantPatterns.length === 0) return prompt;
  
  // For now, we'll just use the most relevant pattern's structure
  const topPattern = relevantPatterns[0].pattern;
  
  // If this is a prompt about how to structure prompts/instructions
  if (topPattern.domain === "identity" || 
      prompt.toLowerCase().includes("prompt") || 
      prompt.toLowerCase().includes("instruction")) {
    
    // Extract key elements from the top pattern's template
    const templateStructure = topPattern.template;
    
    // For identity/role patterns, provide explicit structure guidance
    if (topPattern.name === "Role Definition") {
      return `${prompt}. Use a clear role definition at the beginning (e.g., "${topPattern.examples[0]}"). Define specific capabilities and limitations. Use structured formatting with sections for different types of instructions.`;
    }
    
    // For capability enumerations, suggest numbered lists
    if (topPattern.name === "Capability Enumeration") {
      return `${prompt}. Use numbered lists to clearly enumerate capabilities (e.g., "${topPattern.examples[0].split('\n')[0]}"). Organize information hierarchically with main sections and subsections.`;
    }
    
    // For process definitions, suggest step-by-step format
    if (topPattern.name === "Process Definition") {
      return `${prompt}. Define processes as numbered steps (e.g., "${topPattern.examples[0].split('\n')[0]}"). Use clear headers to separate different sections.`;
    }
    
    // For constraint definitions, suggest explicit MUST/MUST NOT
    if (topPattern.name === "Constraint Definition") {
      return `${prompt}. Clearly state constraints using explicit language like "MUST" and "MUST NOT" (e.g., "${topPattern.examples[0]}").`;
    }
  }
  
  return prompt;
}

/**
 * Format context information to be concise and relevant
 */
function formatContext(context: string, prompt: string): string {
  // Extract key information from context
  const contextLower = context.toLowerCase();
  const promptLower = prompt.toLowerCase();
  
  // Is this context about a person?
  if (contextLower.includes('dr.') || 
      contextLower.includes('dr ') || 
      contextLower.includes('professor') ||
      contextLower.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/)) {
    
    // Extract name if present
    let name = '';
    const nameMatch = context.match(/(?:Dr\.?|Professor)?\s*([A-Z][a-z]+\s+[A-Z][a-z]+)/);
    if (nameMatch) {
      name = nameMatch[1];
    }
    
    // Extract profession/role
    let profession = '';
    if (contextLower.includes('doctor') || contextLower.includes('dr ')) {
      profession = 'doctor';
    } else if (contextLower.includes('orthodontist')) {
      profession = 'orthodontist';
    } else if (contextLower.includes('dentist')) {
      profession = 'dentist';
    } else if (contextLower.includes('professor')) {
      profession = 'professor';
    } else if (contextLower.includes('lawyer')) {
      profession = 'lawyer';
    }
    
    // Extract organization
    let organization = '';
    if (contextLower.includes('university') || contextLower.includes('universiti')) {
      const orgMatch = context.match(/(?:at|from)\s+([A-Z][a-z]+(?: [A-Z][a-z]+)*)/);
      if (orgMatch) {
        organization = orgMatch[1];
      }
    }
    
    // Format person context
    const parts = [];
    if (name && !promptLower.includes(name.toLowerCase())) {
      parts.push(name);
    }
    if (profession && !promptLower.includes(profession)) {
      parts.push(`a ${profession}`);
    }
    if (organization && !promptLower.includes(organization.toLowerCase())) {
      parts.push(`at ${organization}`);
    }
    
    return parts.join(' ');
  }
  
  // For other types of context, simply return it cleaned up
  return context.trim();
}

/**
 * Enhanced prompt generation using example-based learning
 */
export async function enhancePrompt(
  rawPrompt: string,
  context: string = ""
): Promise<string> {
  // Clean up input
  const cleanPrompt = rawPrompt.trim();
  const cleanContext = context ? context.trim() : undefined;
  
  // Check for special case - prompt already contains enhanced instructions
  if (cleanPrompt.length > 100 && 
      (cleanPrompt.includes('Include') || cleanPrompt.includes('section'))) {
    // This prompt is likely already enhanced - remove duplicate instructions
    return removeDuplicateInstructions(cleanPrompt);
  }
  
  // Identify the domain
  const domain = identifyDomain(cleanPrompt, cleanContext);
  
  // Find both example-based and pattern-based enhancements
  const relevantExamples = findRelevantExamples(cleanPrompt, cleanContext);
  const relevantPatterns = findRelevantPromptPatterns(cleanPrompt, cleanContext, domain);
  
  // If this is a prompt about prompting, prioritize pattern-based enhancement
  if (domain === 'prompting' || cleanPrompt.toLowerCase().includes('prompt')) {
    // Apply relevant pattern templates first
    let enhancedPrompt = cleanPrompt;
    
    if (relevantPatterns.length > 0) {
      enhancedPrompt = applyPromptPatterns(enhancedPrompt, relevantPatterns);
    }
    
    // Then blend with relevant examples if available
    if (relevantExamples.length > 0 && relevantExamples[0].similarity > 0.2) {
      enhancedPrompt = blendExampleWithPrompt(enhancedPrompt, cleanContext, relevantExamples[0].example);
    }
    
    return enhancedPrompt;
  }
  
  // For other domains, prioritize example-based enhancement
  if (relevantExamples.length > 0 && relevantExamples[0].similarity > 0.2) {
    return blendExampleWithPrompt(cleanPrompt, cleanContext, relevantExamples[0].example);
  }
  
  // Fall back to basic enhancement
  return basicEnhancement(cleanPrompt, cleanContext || '', domain);
}

/**
 * Basic enhancement when no good examples are found
 */
function basicEnhancement(prompt: string, context: string, domain: string): string {
  // Start with clean prompt
  let enhanced = prompt;
  
  // Add context if available
  if (context) {
    const formattedContext = formatContext(context, prompt);
    if (formattedContext && !enhanced.toLowerCase().includes(formattedContext.toLowerCase())) {
      enhanced = `${formattedContext}. ${enhanced}`;
    }
  }
  
  // Add domain-specific enhancements
  if (domain === 'website') {
    if (!enhanced.toLowerCase().includes('include') && 
        !enhanced.toLowerCase().includes('section')) {
      enhanced += ". Include sections for services, about, testimonials, and contact information";
    }
  } else if (domain === 'writing') {
    if (!enhanced.toLowerCase().includes('include')) {
      enhanced += ". Include a clear structure with introduction, main points, and conclusion";
    }
  } else if (domain === 'programming') {
    if (!enhanced.toLowerCase().includes('include')) {
      enhanced += ". Include error handling, documentation, and consider performance implications";
    }
  } else if (domain === 'prompting') {
    if (!enhanced.toLowerCase().includes('include')) {
      enhanced += ". Include clear role definition, capability specification, and explicit constraints";
    }
  }
  
  return enhanced;
}

/**
 * Remove duplicate instructions from an already enhanced prompt
 */
function removeDuplicateInstructions(prompt: string): string {
  // Split by sentence and analyze
  const sentences = prompt.split(/(?<=[.!?])\s+/);
  
  // Check for duplicate "Include" phrases
  const includeSentences = sentences.filter(s => 
    s.includes('Include') || s.includes('include')
  );
  
  if (includeSentences.length > 1) {
    // Keep only the most detailed "Include" sentence
    const mostDetailed = includeSentences.sort((a, b) => b.length - a.length)[0];
    
    // Filter out other include sentences
    const filtered = sentences.filter(s => 
      s === mostDetailed || !(s.includes('Include') || s.includes('include'))
    );
    
    return filtered.join(' ');
  }
  
  return prompt;
}

/**
 * Track and learn from feedback on enhancement quality
 */
export async function learnFromFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedback?: string
): Promise<void> {
  // Store feedback for learning
  feedbackHistory.push({
    rawPrompt: originalPrompt,
    enhancedPrompt,
    wasSuccessful,
    feedback,
    timestamp: new Date()
  });
  
  // Analyze all feedback to improve enhancement (happens in background)
  if (feedbackHistory.length >= 5) {
    // Here we would periodically analyze feedback and adapt our enhancement patterns
    // For now, just log it
    console.log("Learning from feedback history:", 
      feedbackHistory.map(f => ({ 
        wasSuccessful: f.wasSuccessful, 
        feedback: f.feedback 
      }))
    );
  }
} 