// Core prompt enhancement framework
// This will implement our self-optimizing prompt enhancer framework
//
// Dependencies:
// These dependencies have been added to package.json and need to be installed:
// Run: npm install
// This will install:
// - mongodb and @types/mongodb for database persistence
// - uuid and @types/uuid for unique ID generation

import { MongoClient, Collection } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

interface PromptPattern {
  id: string
  name: string
  description: string
  pattern: string
  category: string
  score: number
  usageCount: number
  examples: Array<{input: string, output: string}>
}

interface EnhancementRule {
  id: string
  name: string
  description: string
  condition: (prompt: string, context: string) => boolean
  apply: (prompt: string, context: string) => string
  priority: number
}

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
      return `You are ${role}.\n\n${prompt}`;
    },
    priority: 10
  },
  {
    id: "add-output-format",
    name: "Add Output Format",
    description: "Specifies desired output format if not present",
    condition: (prompt: string) => 
      !prompt.toLowerCase().includes("format") && 
      !prompt.toLowerCase().includes("structure"),
    apply: (prompt: string) => {
      return `${prompt}\n\nProvide your response in a well-structured format with clear sections and concise explanations.`;
    },
    priority: 5
  },
  {
    id: "add-question-clarity",
    name: "Add Question Clarity",
    description: "Enhances prompts that contain questions by adding clarity and context.",
    condition: (prompt: string) => prompt.includes("?"),
    apply: (prompt: string) => {
      return `${prompt}\n\nPlease provide detailed and clear answers to the questions above.`;
    },
    priority: 7
  }
];

// Domain-specific rules
const academicRule: EnhancementRule = {
  id: "academic-writing",
  name: "Academic Writing Format",
  description: "Adds academic writing structure for scholarly prompts",
  condition: (prompt: string) => {
    const keywords = ["research", "academic", "thesis", "dissertation", "scholarly", "journal", "paper"];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
  },
  apply: (prompt: string) => {
    return `${prompt}\n\nPlease structure your response in an academic format with: introduction, literature review, methodology, findings, discussion, and conclusion. Use formal language and cite relevant sources where applicable.`;
  },
  priority: 8
};

const creativeRule: EnhancementRule = {
  id: "creative-content",
  name: "Creative Content Format",
  description: "Enhances prompts related to creative writing",
  condition: (prompt: string) => {
    const keywords = ["story", "creative", "fiction", "narrative", "poem", "novel", "screenplay"];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
  },
  apply: (prompt: string) => {
    return `${prompt}\n\nApproach this creative task with originality. Focus on developing compelling characters, engaging dialogue, vivid descriptions, and a coherent narrative structure.`;
  },
  priority: 8
};

const technicalRule: EnhancementRule = {
  id: "technical-documentation",
  name: "Technical Documentation Format",
  description: "Enhances prompts related to technical documentation",
  condition: (prompt: string) => {
    const keywords = ["documentation", "technical", "manual", "guide", "tutorial", "howto", "how-to"];
    return keywords.some(keyword => prompt.toLowerCase().includes(keyword));
  },
  apply: (prompt: string) => {
    return `${prompt}\n\nProvide clear step-by-step instructions with examples. Include prerequisites, potential errors and troubleshooting steps, and any relevant technical specifications.`;
  },
  priority: 8
};

// Professional titles rule
const professionalTitleRule: EnhancementRule = {
  id: "professional-title-handling",
  name: "Professional Title Handling",
  description: "Ensures professional titles are handled appropriately",
  condition: (prompt: string) => {
    // Check for various professional titles
    const titlePatterns = [
      /professor/i, /doctor/i, /dr\./i, /phd/i, 
      /md/i, /attorney/i, /lawyer/i, /counsel/i,
      /dentist/i, /orthodontist/i, /surgeon/i
    ];
    return titlePatterns.some(pattern => pattern.test(prompt));
  },
  apply: (prompt: string) => {
    // Handle potentially problematic words next to professional titles
    let result = prompt;
    
    // Replace problematic constructs with appropriate alternatives
    result = result.replace(/\b(professor|doctor|dr\.|phd|md|attorney|lawyer|counsel|dentist|orthodontist|surgeon)\s+(cum|vs|versus)\s+/gi, 
      (match, title, conjunction) => {
        // Replace 'cum' with 'and' or 'with appointment as' when used with professional titles
        if (conjunction.toLowerCase() === 'cum') {
          return `${title} with appointment as `;
        }
        return match; // Keep other conjunctions unchanged
      }
    );
    
    // Additional fix for professional title combinations (handle in either order)
    // Example: "associate professor orthodontist" or "orthodontist associate professor"
    const titles = ['professor', 'doctor', 'dr.', 'phd', 'md', 'attorney', 'lawyer', 'counsel', 'dentist', 'orthodontist', 'surgeon'];
    const positions = ['associate', 'assistant', 'adjunct', 'visiting', 'clinical', 'research'];
    
    for (const title1 of titles) {
      for (const title2 of titles) {
        if (title1 !== title2) {
          // Match both "title1 title2" and "title2 title1" patterns
          const pattern1 = new RegExp(`\\b${title1}\\s+${title2}\\b`, 'gi');
          const pattern2 = new RegExp(`\\b${title2}\\s+${title1}\\b`, 'gi');
          
          // Replace with "title1 and title2"
          result = result.replace(pattern1, `${title1} and ${title2}`);
          result = result.replace(pattern2, `${title2} and ${title1}`);
          
          // Also handle cases with positions like "associate professor orthodontist"
          for (const position of positions) {
            const patternWithPosition1 = new RegExp(`\\b${position}\\s+${title1}\\s+${title2}\\b`, 'gi');
            const patternWithPosition2 = new RegExp(`\\b${position}\\s+${title2}\\s+${title1}\\b`, 'gi');
            const patternWithPosition3 = new RegExp(`\\b${title1}\\s+${position}\\s+${title2}\\b`, 'gi');
            const patternWithPosition4 = new RegExp(`\\b${title2}\\s+${position}\\s+${title1}\\b`, 'gi');
            
            result = result.replace(patternWithPosition1, `${position} ${title1} and ${title2}`);
            result = result.replace(patternWithPosition2, `${position} ${title2} and ${title1}`);
            result = result.replace(patternWithPosition3, `${title1} ${position} and ${title2}`);
            result = result.replace(patternWithPosition4, `${title2} ${position} and ${title1}`);
          }
        }
      }
    }
    
    return result;
  },
  priority: 20 // Highest priority to handle professional titles first
};

// Add all new rules to the rules array
rules.push(academicRule, creativeRule, technicalRule, professionalTitleRule);

// Helper function to determine appropriate role based on prompt content
function determineRole(prompt: string, context: string): string {
  const combinedText = (prompt + " " + context).toLowerCase();
  
  if (combinedText.includes("code") || combinedText.includes("programming")) {
    return "an expert software engineer with deep knowledge of programming languages, algorithms, and software development practices";
  } else if (combinedText.includes("write") || combinedText.includes("essay")) {
    return "a professional writer with expertise in creating engaging and informative content";
  } else if (combinedText.includes("analyze") || combinedText.includes("data")) {
    return "a data analyst with expertise in interpreting complex datasets and providing insights";
  } else {
    return "an AI assistant with expertise in providing helpful, accurate, and comprehensive information";
  }
}

// Basic NLP analysis for prompt intent
interface PromptIntent {
  category: 'informational' | 'creative' | 'instructional' | 'analytical' | 'unknown';
  confidence: number;
  entities: string[];
  keywords: string[];
}

// Analyze prompt intent using basic NLP techniques
function analyzePromptIntent(prompt: string): PromptIntent {
  const lowerPrompt = prompt.toLowerCase();
  const words = lowerPrompt.split(/\s+/);
  
  // Extract potential entities (capitalized words not at beginning of sentences)
  const entities = prompt.match(/(?<!\.\s|^)[A-Z][a-z]+/g) || [];
  
  // Extract keywords (excluding common stop words)
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of']);
  const keywords = words.filter(word => word.length > 3 && !stopWords.has(word));
  
  // Determine likely category
  let category: PromptIntent['category'] = 'unknown';
  let confidence = 0.5;
  
  // Check for question patterns
  if (prompt.includes('?')) {
    category = 'informational';
    confidence = 0.7;
  }
  
  // Check for instructional patterns
  const instructionalWords = ['create', 'make', 'build', 'design', 'develop', 'implement', 'code', 'write', 'generate'];
  if (instructionalWords.some(word => lowerPrompt.includes(word))) {
    category = 'instructional';
    confidence = 0.8;
  }
  
  // Check for creative patterns
  const creativeWords = ['story', 'poem', 'creative', 'imagine', 'fiction', 'narrative'];
  if (creativeWords.some(word => lowerPrompt.includes(word))) {
    category = 'creative';
    confidence = 0.8;
  }
  
  // Check for analytical patterns
  const analyticalWords = ['analyze', 'evaluate', 'compare', 'contrast', 'examine', 'assess', 'review'];
  if (analyticalWords.some(word => lowerPrompt.includes(word))) {
    category = 'analytical';
    confidence = 0.8;
  }
  
  return {
    category,
    confidence,
    entities,
    keywords: keywords.slice(0, 10) // Limit to top 10 keywords
  };
}

// Rule conflict resolution
// Track which rules have been applied to avoid redundancy
const appliedRuleIds = new Set<string>();

// Interface for persisted rules and patterns
interface PersistedRule extends EnhancementRule {
  version: number;
  lastUpdated: Date;
  effectiveness: number; // Measure of rule effectiveness (0-1)
}

interface PersistedPattern extends PromptPattern {
  version: number;
  lastUpdated: Date;
}

// MongoDB connection
let dbClient: MongoClient | null = null;
let rulesCollection: Collection<PersistedRule> | null = null;
let patternsCollection: Collection<PersistedPattern> | null = null;
let promptHistoryCollection: Collection | null = null;

// Initialize database connection
async function initDatabase() {
  try {
    // Get MongoDB connection string from environment variables
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/promptEnhancer';
    
    dbClient = new MongoClient(mongoUri);
    await dbClient.connect();
    console.log('Connected to MongoDB');
    
    const db = dbClient.db();
    rulesCollection = db.collection<PersistedRule>('rules');
    patternsCollection = db.collection<PersistedPattern>('patterns');
    promptHistoryCollection = db.collection('promptHistory');
    
    // Create indexes
    await rulesCollection.createIndex({ id: 1 }, { unique: true });
    await patternsCollection.createIndex({ id: 1 }, { unique: true });
    
    // Initialize with default rules if collection is empty
    const rulesCount = await rulesCollection.countDocuments();
    if (rulesCount === 0) {
      console.log('Initializing default rules');
      
      // Convert in-memory rules to persisted rules
      const persistedRules: PersistedRule[] = rules.map(rule => ({
        ...rule,
        version: 1,
        lastUpdated: new Date(),
        effectiveness: 0.5, // Start with neutral effectiveness
      }));
      
      await rulesCollection.insertMany(persistedRules);
    }
    
    // Initialize with default patterns if collection is empty
    const patternsCount = await patternsCollection.countDocuments();
    if (patternsCount === 0) {
      console.log('Initializing default patterns');
      
      // Convert in-memory patterns to persisted patterns
      const persistedPatterns: PersistedPattern[] = patterns.map(pattern => ({
        ...pattern,
        version: 1,
        lastUpdated: new Date(),
      }));
      
      await patternsCollection.insertMany(persistedPatterns);
    }
    
    // Load rules and patterns from database
    await loadRulesAndPatterns();
    
  } catch (error) {
    console.error('Failed to connect to database:', error);
    // Fall back to in-memory operation if database connection fails
  }
}

// A/B testing functionality
// Track different versions of rules for comparison
const abTestGroups = ['A', 'B'] as const;
type TestGroup = typeof abTestGroups[number];

interface ABTestConfig {
  isEnabled: boolean;
  testId: string;
  startDate: Date;
  endDate: Date;
  rulesVariants: {
    [key in TestGroup]: EnhancementRule[];
  };
  results: {
    [key in TestGroup]: { totalPrompts: number; successfulEnhancements: number };
  };
}

const abTestConfig: ABTestConfig = {
  isEnabled: true,
  testId: uuidv4(),
  startDate: new Date(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
  rulesVariants: {
    A: [], // Default rules
    B: []  // Experimental rules
  },
  results: {
    A: { totalPrompts: 0, successfulEnhancements: 0 },
    B: { totalPrompts: 0, successfulEnhancements: 0 }
  }
};

// Load rules and patterns from database
async function loadRulesAndPatterns() {
  if (!rulesCollection || !patternsCollection) return;
  
  try {
    // Load rules
    const dbRules = await rulesCollection.find({}).toArray();
    if (dbRules.length > 0) {
      // Replace in-memory rules with database rules
      rules.length = 0;
      dbRules.forEach((dbRule: PersistedRule) => {
        // Convert persisted rule back to enhancement rule
        const { version, lastUpdated, effectiveness, ...enhancementRule } = dbRule;
        rules.push(enhancementRule as EnhancementRule);
      });
    }
    
    // Load patterns
    const dbPatterns = await patternsCollection.find({}).toArray();
    if (dbPatterns.length > 0) {
      // Replace in-memory patterns with database patterns
      patterns.length = 0;
      dbPatterns.forEach((dbPattern: PersistedPattern) => {
        // Convert persisted pattern back to prompt pattern
        const { version, lastUpdated, ...promptPattern } = dbPattern;
        patterns.push(promptPattern as PromptPattern);
      });
    }
    
    console.log(`Loaded ${rules.length} rules and ${patterns.length} patterns from database`);
  } catch (error) {
    console.error('Failed to load rules and patterns from database:', error);
  }
}

// Assign A/B test group to user session
function getABTestGroup(userId: string): TestGroup {
  if (!abTestConfig.isEnabled) return 'A'; // Default group if testing is disabled
  
  // Use consistent hashing to assign users to groups
  const hash = Array.from(userId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const groupIndex = hash % abTestGroups.length;
  return abTestGroups[groupIndex];
}

// Track A/B test results
async function trackABTestResult(group: TestGroup, wasSuccessful: boolean) {
  if (!abTestConfig.isEnabled) return;
  
  abTestConfig.results[group].totalPrompts += 1;
  if (wasSuccessful) {
    abTestConfig.results[group].successfulEnhancements += 1;
  }
  
  // Save results to database
  if (promptHistoryCollection) {
    try {
      await promptHistoryCollection.updateOne(
        { testId: abTestConfig.testId },
        {
          $set: {
            results: abTestConfig.results,
            lastUpdated: new Date()
          },
          $setOnInsert: {
            startDate: abTestConfig.startDate,
            endDate: abTestConfig.endDate
          }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('Failed to save A/B test results:', error);
    }
  }
}

// Enhanced version of our main function that incorporates A/B testing
export async function enhancePrompt(
  rawPrompt: string,
  context: string = "",
  userId: string = uuidv4() // Generate random ID if not provided
): Promise<string> {
  // Initialize database if not already done
  if (!dbClient) {
    await initDatabase();
  }
  
  // Initialize A/B test if not already done
  if (abTestConfig.isEnabled && abTestConfig.rulesVariants.B.length === 0) {
    await initABTest();
  }
  
  // Determine A/B test group
  const testGroup = getABTestGroup(userId);
  console.log(`Using test group ${testGroup} for user ${userId}`);
  
  // Use the appropriate rule set based on test group
  const rulesForUser = abTestConfig.rulesVariants[testGroup] || rules;
  
  let enhancedPrompt = rawPrompt.trim();
  // Reset applied rules for this enhancement
  appliedRuleIds.clear();
  
  // Apply professional title rule first (highest priority)
  const titleRule = rulesForUser.find(r => r.id === "professional-title-handling");
  if (titleRule && titleRule.condition(enhancedPrompt, context)) {
    enhancedPrompt = titleRule.apply(enhancedPrompt, context);
    appliedRuleIds.add(titleRule.id);
  }
  
  // Perform NLP analysis
  const intent = analyzePromptIntent(enhancedPrompt);
  console.log("Prompt intent analysis:", intent);
  
  // Apply enhancement rules in priority order with conflict resolution
  const sortedRules = [...rulesForUser]
    .filter(rule => rule.id !== "professional-title-handling") // Skip title rule as already applied
    .sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    // Skip if rule has already been applied
    if (appliedRuleIds.has(rule.id)) continue;
    
    // Skip if a similar category rule has been applied to avoid redundancy
    if (rule.id.includes("format") && Array.from(appliedRuleIds).some(id => id.includes("format"))) {
      continue;
    }
    
    // Apply rule if condition matches
    if (rule.condition(enhancedPrompt, context)) {
      const beforeLength = enhancedPrompt.length;
      enhancedPrompt = rule.apply(enhancedPrompt, context);
      
      // Only mark as applied if it actually changed the prompt
      if (enhancedPrompt.length !== beforeLength) {
        appliedRuleIds.add(rule.id);
      }
    }
  }
  
  // Add context if provided and not already included
  if (context && !enhancedPrompt.includes(context)) {
    enhancedPrompt = `Context: ${context}\n\n${enhancedPrompt}`;
  }
  
  // Adjust based on intent if not already enhanced
  if (intent.confidence > 0.7 && appliedRuleIds.size === 0) {
    // Add default formatting based on detected intent
    switch (intent.category) {
      case 'informational':
        enhancedPrompt += "\n\nPlease provide a comprehensive and factual response with relevant details.";
        break;
      case 'creative':
        enhancedPrompt += "\n\nPlease be creative and imaginative in your response.";
        break;
      case 'instructional':
        enhancedPrompt += "\n\nPlease provide clear, step-by-step instructions.";
        break;
      case 'analytical':
        enhancedPrompt += "\n\nPlease provide a thoughtful analysis with supporting evidence.";
        break;
    }
  }
  
  // Track pattern usage for learning
  trackPatternUsage(enhancedPrompt);
  
  // Track A/B test usage
  trackABTestResult(testGroup, true); // Assume successful initially
  
  return enhancedPrompt;
}

// Function to track which patterns were used in a prompt
function trackPatternUsage(prompt: string): void {
  for (const pattern of patterns) {
    // Simple check if pattern might be present in the prompt
    // In a real implementation, you'd use more sophisticated matching
    if (prompt.toLowerCase().includes(pattern.name.toLowerCase())) {
      pattern.usageCount += 1;
    }
  }
}

// Enhanced version of learnFromFeedback to incorporate A/B testing and persistence
export async function learnFromFeedback(
  originalPrompt: string,
  enhancedPrompt: string,
  wasSuccessful: boolean,
  feedback?: string,
  userId?: string
): Promise<void> {
  console.log("Learning from feedback", {
    originalPrompt,
    enhancedPrompt,
    wasSuccessful,
    feedback
  });

  // Adjust pattern scores based on feedback
  patterns.forEach(pattern => {
    if (enhancedPrompt.toLowerCase().includes(pattern.name.toLowerCase())) {
      if (wasSuccessful) {
        pattern.score += 0.1; // Increase score for successful enhancements
      } else {
        pattern.score -= 0.1; // Decrease score for unsuccessful enhancements
      }
      // Ensure score remains within bounds
      pattern.score = Math.max(0, Math.min(1, pattern.score));
    }
  });
  
  // If we have a user ID, update A/B test results
  if (userId) {
    const testGroup = getABTestGroup(userId);
    trackABTestResult(testGroup, wasSuccessful);
  }
  
  // Save updated patterns and rules to database
  await saveRulesAndPatterns();
  
  console.log("Updated patterns:", patterns);
}

// Save rules and patterns to database
async function saveRulesAndPatterns() {
  if (!rulesCollection || !patternsCollection) return;
  
  try {
    // Save rules
    for (const rule of rules) {
      // Find existing rule
      const existingRule = await rulesCollection.findOne({ id: rule.id });
      
      if (existingRule) {
        // Update existing rule
        await rulesCollection.updateOne({ id: rule.id }, {
          $set: {
            ...rule,
            version: existingRule.version + 1,
            lastUpdated: new Date(),
          }
        });
      } else {
        // Insert new rule
        await rulesCollection.insertOne({
          ...rule,
          version: 1,
          lastUpdated: new Date(),
          effectiveness: 0.5,
        } as PersistedRule);
      }
    }
    
    // Save patterns
    for (const pattern of patterns) {
      // Find existing pattern
      const existingPattern = await patternsCollection.findOne({ id: pattern.id });
      
      if (existingPattern) {
        // Update existing pattern
        await patternsCollection.updateOne({ id: pattern.id }, {
          $set: {
            ...pattern,
            version: existingPattern.version + 1,
            lastUpdated: new Date(),
          }
        });
      } else {
        // Insert new pattern
        await patternsCollection.insertOne({
          ...pattern,
          version: 1,
          lastUpdated: new Date(),
        } as PersistedPattern);
      }
    }
    
    console.log('Saved rules and patterns to database');
  } catch (error) {
    console.error('Failed to save rules and patterns to database:', error);
  }
}

// Initialize A/B test with different rule variations
async function initABTest() {
  try {
    // Create experimental rules variant (more aggressive enhancement)
    abTestConfig.rulesVariants.A = [...rules]; // Default rules
    
    // Create more aggressive versions of rules for B variant
    abTestConfig.rulesVariants.B = rules.map(rule => {
      // For certain rule types, make more aggressive versions
      if (rule.id === 'add-output-format') {
        return {
          ...rule,
          apply: (prompt: string) => {
            return `${prompt}\n\nProvide your response in a detailed, comprehensive format with multiple sections, examples, and visual descriptions. Ensure your answer is thorough and covers all aspects of the request.`;
          }
        };
      }
      return rule; // Keep other rules the same
    });
    
    // Add an experimental rule to B variant
    abTestConfig.rulesVariants.B.push({
      id: "experimental-rule",
      name: "Tone Enhancement",
      description: "Adjusts the tone based on prompt complexity",
      condition: (prompt: string) => prompt.length > 50,
      apply: (prompt: string) => {
        const complexity = prompt.length > 200 ? "formal" : "conversational";
        return `${prompt}\n\nUse a ${complexity} tone in your response.`;
      },
      priority: 3
    });
    
    console.log('A/B test initialized');
  } catch (error) {
    console.error('Failed to initialize A/B test:', error);
  }
}

// Initialize database when module is loaded
initDatabase().catch(error => {
  console.error('Failed to initialize database:', error);
  console.log('Operating in memory-only mode');
}); 