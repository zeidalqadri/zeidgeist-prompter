// Master Control Program (MCP) Agent for Prompt Enhancement
// Self-optimizing framework that actively adapts to user feedback

interface PromptPattern {
  id: string
  name: string
  description: string
  pattern: string
  category: string
  score: number // Higher score = more successful applications
  usageCount: number
  examples: Array<{input: string, output: string}>
}

interface EnhancementRule {
  id: string
  name: string
  description: string
  condition: (prompt: string, context: string) => boolean
  apply: (prompt: string, context: string) => string
  priority: number // Higher priority = applied earlier
  successRate: number // Track success rate from 0.0 to 1.0
  appliedCount: number // Times this rule has been applied
}

// Performance tracking of rule combinations
interface RuleCombination {
  ruleIds: string[]
  successCount: number
  failureCount: number
}

// Tracking currently used models for learning
let activeRuleCombinations: RuleCombination[] = [];

// In-memory storage for patterns and rules
// In a production environment, you'd use a database
const patterns: PromptPattern[] = [
  {
    id: "clear-role-definition",
    name: "Clear Role Definition",
    description: "Defines the AI's role and capabilities clearly at the beginning",
    pattern: "You are {role}, {capabilities}",
    category: "identity",
    score: 0.8,
    usageCount: 0,
    examples: [
      {
        input: "Write me an essay about climate change",
        output: "You are a scientific expert specializing in climate science. You have extensive knowledge of climate patterns, environmental impacts, and mitigation strategies. Write me an essay about climate change."
      }
    ]
  },
  {
    id: "explicit-instructions",
    name: "Explicit Instructions",
    description: "Provides clear, actionable directives for the AI",
    pattern: "{action} the following {task}. {specific instructions}",
    category: "instructions",
    score: 0.9,
    usageCount: 0,
    examples: [
      {
        input: "Tell me about dogs",
        output: "Provide a comprehensive overview of dogs as domesticated animals. Include information about their evolution, common breeds, behavioral traits, and their relationship with humans. Format your response with clear headings and concise paragraphs."
      }
    ]
  },
  {
    id: "contextual-enrichment",
    name: "Contextual Enrichment",
    description: "Enriches the prompt with contextual information",
    pattern: "{context_info}. {original_prompt}",
    category: "context",
    score: 0.85,
    usageCount: 0,
    examples: [
      {
        input: "Create a logo for my business",
        output: "You are designing a logo for a business that specializes in handcrafted wooden furniture with a modern aesthetic. Create a logo for my business."
      }
    ]
  }
];

const rules: EnhancementRule[] = [
  {
    id: "add-role-definition",
    name: "Add Role Definition",
    description: "Adds a role definition if none exists",
    condition: (prompt: string) => !prompt.toLowerCase().includes("you are"),
    apply: (prompt: string, context: string) => {
      // Determine appropriate role based on the prompt content
      const role = determineRole(prompt, context);
      return `You are ${role}. ${prompt}`;
    },
    priority: 10,
    successRate: 0.7,
    appliedCount: 0
  },
  {
    id: "add-context-prefix",
    name: "Add Context Prefix",
    description: "Adds context information before the prompt",
    condition: (prompt: string, context: string) => 
      !!context && context.trim().length > 0 && !prompt.toLowerCase().includes(context.toLowerCase()),
    apply: (prompt: string, context: string) => {
      // Proper sentence joining with period if needed
      if (context.trim().endsWith('.')) {
        return `${context.trim()} ${prompt}`;
      } else {
        return `${context.trim()}. ${prompt}`;
      }
    },
    priority: 20,
    successRate: 0.9,
    appliedCount: 0
  },
  {
    id: "add-domain-specificity",
    name: "Add Domain Specificity",
    description: "Adds domain-specific instructions for certain topics",
    condition: (prompt: string, context: string) => {
      const combinedText = (prompt + " " + context).toLowerCase();
      return combinedText.includes("webpage") || 
        combinedText.includes("website") || 
        combinedText.includes("design") ||
        combinedText.includes("code");
    },
    apply: (prompt: string, context: string) => {
      const combinedText = (prompt + " " + context).toLowerCase();
      
      if (combinedText.includes("webpage") || combinedText.includes("website")) {
        return `${prompt}. Include a modern, responsive design with navigation, hero section, about section, services, and contact information.`;
      } else if (combinedText.includes("code") || combinedText.includes("programming")) {
        return `${prompt}. Provide clean, well-commented, and efficient code with proper error handling.`;
      }
      
      return prompt;
    },
    priority: 5,
    successRate: 0.6,
    appliedCount: 0
  }
];

// Helper function to determine appropriate role based on prompt content
function determineRole(prompt: string, context: string): string {
  const combinedText = (prompt + " " + context).toLowerCase();
  
  if (combinedText.includes("code") || combinedText.includes("programming") || 
      combinedText.includes("website") || combinedText.includes("webpage")) {
    return "an expert software engineer with deep knowledge of programming languages, algorithms, and software development practices";
  } else if (combinedText.includes("write") || combinedText.includes("essay") || 
             combinedText.includes("article")) {
    return "a professional writer with expertise in creating engaging and informative content";
  } else if (combinedText.includes("design") || combinedText.includes("logo") || 
             combinedText.includes("art")) {
    return "a skilled designer with expertise in visual communication and aesthetics";
  } else if (combinedText.includes("doctor") || combinedText.includes("medical") || 
             combinedText.includes("health") || combinedText.includes("orthodontist") ||
             combinedText.includes("dentist")) {
    return "a medical communication specialist with knowledge of healthcare terminology and practices";
  } else {
    return "an AI assistant with expertise in providing helpful, accurate, and comprehensive information";
  }
}

// Core function to enhance a prompt based on our framework
export async function enhancePrompt(
  rawPrompt: string,
  context: string = ""
): Promise<string> {
  // Start with cleanup - remove redundancies in the raw prompt itself
  let enhancedPrompt = removeDuplicatePhrases(rawPrompt.trim());
  const usedRuleIds: string[] = [];
  
  // Format context to be brief and informative, removing redundancy with prompt
  let formattedContext = "";
  if (context && context.trim()) {
    formattedContext = formatContext(context.trim(), enhancedPrompt);
  }
  
  // If we have a formatted context, add it only if it adds value
  if (formattedContext) {
    // Only add context if it's not redundant with the prompt
    if (!containsSubstantialOverlap(enhancedPrompt, formattedContext)) {
      if (formattedContext.endsWith('.')) {
        enhancedPrompt = `${formattedContext} ${enhancedPrompt}`;
      } else {
        enhancedPrompt = `${formattedContext}. ${enhancedPrompt}`;
      }
      usedRuleIds.push("smart-context-integration");
    }
  }
  
  // Apply domain-specific enhancements only if they're not redundant
  const combinedText = (rawPrompt + " " + context).toLowerCase();
  
  // Check if the prompt already contains website section specifications
  const hasWebsiteSpecs = enhancedPrompt.toLowerCase().includes("navigation") && 
                         enhancedPrompt.toLowerCase().includes("section") &&
                         (enhancedPrompt.toLowerCase().includes("hero") || 
                          enhancedPrompt.toLowerCase().includes("about"));
  
  // Only add website specs if they're not already present
  if (!hasWebsiteSpecs && 
      (combinedText.includes("webpage") || combinedText.includes("website"))) {
    if (combinedText.includes("orthodont") || combinedText.includes("dentist")) {
      enhancedPrompt += ". Include sections for services/treatments offered, before/after patient galleries, professional credentials, and a patient-friendly appointment booking system";
      usedRuleIds.push("specialized-orthodontist-guidance");
    }
  }
  
  // Track this combination of rules for learning
  if (usedRuleIds.length > 0) {
    trackRuleCombination(usedRuleIds);
  }
  
  // Also track pattern usage for learning
  trackPatternUsage(enhancedPrompt);
  
  return enhancedPrompt;
}

// Helper to remove duplicate phrases in a string
function removeDuplicatePhrases(text: string): string {
  // Split into sentences
  const sentences = text.split(/(?<=[.!?])\s+/);
  
  // Check for similar sentences and remove duplicates
  const uniqueSentences: string[] = [];
  const lowercaseSentences: string[] = [];
  
  for (const sentence of sentences) {
    const lowercaseSentence = sentence.toLowerCase().trim();
    
    // Check if this sentence is very similar to one we've already kept
    let isDuplicate = false;
    for (const existing of lowercaseSentences) {
      // If 70% or more of the words match, consider it a duplicate
      const similarity = calculateSimilarity(lowercaseSentence, existing);
      if (similarity > 0.7) {
        isDuplicate = true;
        break;
      }
    }
    
    if (!isDuplicate) {
      uniqueSentences.push(sentence);
      lowercaseSentences.push(lowercaseSentence);
    }
  }
  
  return uniqueSentences.join(' ');
}

// Helper to calculate text similarity (percentage of shared words)
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.split(/\s+/).filter(word => word.length > 3));
  const words2 = new Set(text2.split(/\s+/).filter(word => word.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let sharedWords = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      sharedWords++;
    }
  }
  
  return sharedWords / Math.min(words1.size, words2.size);
}

// Intelligently format context, removing redundancy with the prompt
function formatContext(context: string, prompt: string): string {
  // Extract key information from context
  const contextLower = context.toLowerCase();
  const promptLower = prompt.toLowerCase();
  
  // Extract profession if mentioned
  let profession = '';
  if (contextLower.includes('orthodontist')) {
    profession = 'orthodontist';
  } else if (contextLower.includes('dentist')) {
    profession = 'dentist';
  } else if (contextLower.includes('doctor') || contextLower.includes('dr ')) {
    profession = 'doctor';
  }
  
  // Extract academic position if mentioned
  let academic = '';
  if (contextLower.includes('professor')) {
    if (contextLower.includes('associate professor')) {
      academic = 'associate professor';
    } else {
      academic = 'professor';
    }
  }
  
  // Extract institution if mentioned
  let institution = '';
  if (contextLower.includes('universiti')) {
    // Try to get the full institution name
    const uniMatch = context.match(/(?:Universiti|University)\s+\w+(?:\s+\w+)*/i);
    if (uniMatch) {
      institution = uniMatch[0];
    }
  }
  
  // Extract personal info if mentioned
  let personal = '';
  if (contextLower.includes('mother')) {
    const motherMatch = context.match(/mother\s+of\s+\d+/i);
    if (motherMatch) {
      personal = motherMatch[0];
    }
  }
  
  // Build a concise context string with only the key information
  // that isn't already in the prompt
  const contextParts = [];
  
  if (profession && !promptLower.includes(profession)) {
    contextParts.push(profession);
  }
  
  if (academic && !promptLower.includes(academic)) {
    contextParts.push(academic);
  }
  
  if (institution && !promptLower.includes(institution)) {
    contextParts.push(`at ${institution}`);
  }
  
  if (personal && !promptLower.includes(personal)) {
    contextParts.push(personal);
  }
  
  // Join all the parts
  return contextParts.join(', ');
}

// Check if there's substantial overlap between two texts
function containsSubstantialOverlap(text1: string, text2: string): boolean {
  return calculateSimilarity(text1.toLowerCase(), text2.toLowerCase()) > 0.5;
}

// Function to track which patterns were used in a prompt
function trackPatternUsage(prompt: string): void {
  for (const pattern of patterns) {
    // Simple check if pattern might be present in the prompt
    if (prompt.toLowerCase().includes(pattern.name.toLowerCase())) {
      pattern.usageCount += 1;
    }
  }
}

// Track combinations of rules to learn which work well together
function trackRuleCombination(ruleIds: string[]): void {
  // Sort to ensure consistent identification regardless of application order
  const sortedIds = [...ruleIds].sort();
  
  // Store in active combinations for feedback
  let found = false;
  for (const combo of activeRuleCombinations) {
    // Check if same combination (regardless of order)
    if (JSON.stringify(combo.ruleIds.sort()) === JSON.stringify(sortedIds)) {
      found = true;
      break;
    }
  }
  
  if (!found) {
    activeRuleCombinations.push({
      ruleIds: sortedIds,
      successCount: 0,
      failureCount: 0
    });
  }
}

// Learning mechanism to adjust rule priorities based on feedback
function adjustRulePriorities(successful: boolean, usedRuleIds: string[]): void {
  // Adjust individual rule success rates
  for (const ruleId of usedRuleIds) {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      // Calculate new success rate as weighted average
      const weight = successful ? 0.15 : 0.25; // Learn faster from failures than successes
      if (successful) {
        rule.successRate = (1 - weight) * rule.successRate + weight * 1.0;
        // Also slightly boost priority for very successful rules
        if (rule.successRate > 0.8 && rule.priority < 30) {
          rule.priority += 1;
        }
      } else {
        rule.successRate = (1 - weight) * rule.successRate;
        // Reduce priority for failing rules
        if (rule.priority > 1) {
          rule.priority -= 1;
        }
      }
    }
  }
  
  // Look for complementary rules that might work well together
  if (successful && usedRuleIds.length > 1) {
    // If a combination worked well, slightly boost complementary rules
    // This creates a positive feedback loop for successful combinations
    const allRules = [...rules];
    for (let i = 0; i < usedRuleIds.length; i++) {
      for (let j = i + 1; j < usedRuleIds.length; j++) {
        // Mark these two rules as complementary by slightly boosting both
        const rule1 = allRules.find(r => r.id === usedRuleIds[i]);
        const rule2 = allRules.find(r => r.id === usedRuleIds[j]);
        if (rule1 && rule2) {
          if (rule1.successRate < 0.95) rule1.successRate += 0.01;
          if (rule2.successRate < 0.95) rule2.successRate += 0.01;
        }
      }
    }
  }
}

// This function implements learning from feedback
export async function learnFromFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedback?: string
): Promise<void> {
  // If there are no active combinations, this might be a repeat feedback
  // Generate a synthetic combination based on the difference between prompts
  if (activeRuleCombinations.length === 0) {
    const usedRuleIds = inferRulesFromPrompts(originalPrompt, enhancedPrompt);
    if (usedRuleIds.length > 0) {
      trackRuleCombination(usedRuleIds);
    }
  }
  
  // Find the rule combination that was used
  for (const combo of activeRuleCombinations) {
    // Increment success or failure count
    if (wasSuccessful) {
      combo.successCount += 1;
      adjustRulePriorities(true, combo.ruleIds);
    } else {
      combo.failureCount += 1;
      adjustRulePriorities(false, combo.ruleIds);
    }
  }
  
  // Process any textual feedback (for a real system, this would use more advanced NLP)
  if (feedback) {
    // Simple keyword extraction for rule adjustment
    const feedbackLower = feedback.toLowerCase();
    
    // Example: If feedback mentions format issues, adjust format-related rules
    if (feedbackLower.includes("format")) {
      const formatRule = rules.find(r => r.id === "add-output-format");
      if (formatRule) {
        formatRule.priority = wasSuccessful ? formatRule.priority + 1 : Math.max(1, formatRule.priority - 1);
      }
    }
    
    // If user mentions overly complicated or too much text
    if (feedbackLower.includes("too much") || feedbackLower.includes("simpler") || 
        feedbackLower.includes("shorter") || feedbackLower.includes("concise")) {
      // Find the role definition rule and reduce its priority
      const roleRule = rules.find(r => r.id === "add-role-definition");
      if (roleRule) {
        roleRule.priority = Math.max(1, roleRule.priority - 2);
        roleRule.successRate *= 0.8; // Significantly reduce success rate
      }
    }
    
    // If user mentions needing more specificity
    if (feedbackLower.includes("more specific") || feedbackLower.includes("more detail") || 
        feedbackLower.includes("elaborate")) {
      // Boost domain specificity rules
      const domainRule = rules.find(r => r.id === "add-domain-specificity");
      if (domainRule) {
        domainRule.priority += 2;
        domainRule.successRate = Math.min(0.95, domainRule.successRate + 0.1);
      }
    }
  }
  
  // Log for debugging (would be database storage in production)
  console.log("Learning from feedback", {
    originalPrompt,
    enhancedPrompt,
    wasSuccessful,
    feedback,
    activeRuleCombinations: JSON.parse(JSON.stringify(activeRuleCombinations)),
    updatedRules: rules.map(r => ({ id: r.id, priority: r.priority, successRate: r.successRate }))
  });
  
  // Clear active rule combinations for next prompt
  activeRuleCombinations = [];
}

// Infer which rules were likely used based on comparing original and enhanced prompts
function inferRulesFromPrompts(originalPrompt: string, enhancedPrompt: string): string[] {
  const inferred: string[] = [];
  
  // Check for role definition
  if (enhancedPrompt.toLowerCase().includes("you are") && 
      !originalPrompt.toLowerCase().includes("you are")) {
    inferred.push("add-role-definition");
  }
  
  // Check for context addition
  if (enhancedPrompt.includes("Context:") && !originalPrompt.includes("Context:")) {
    inferred.push("add-context-prefix");
  }
  
  // Check for domain specificity
  if ((enhancedPrompt.includes("Include") || 
       enhancedPrompt.includes("section") || 
       enhancedPrompt.includes("navigation")) && 
      !(originalPrompt.includes("Include") || 
        originalPrompt.includes("section") || 
        originalPrompt.includes("navigation"))) {
    inferred.push("add-domain-specificity");
  }
  
  return inferred;
} 