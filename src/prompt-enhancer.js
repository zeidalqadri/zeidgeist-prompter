/**
 * Prompt Enhancer
 * 
 * This is the main module for the prompt enhancement system, which integrates
 * various rule-based enhancements to improve prompts before they are sent to the LLM.
 */

const { needsTitleCorrection, correctProfessionalTitles, getTitleCorrectionInfo } = require('./rules/professional-title-rules');
const { isWebsitePrompt, enhanceWebsitePrompt, getWebsiteEnhancementInfo } = require('./rules/website-enhancement-rules');
const patternLearner = require('./learning/patternLearner');
const ruleWeightLearner = require('./learning/ruleWeightLearner');

/**
 * Enhanced prompt result object structure
 * @typedef {Object} EnhancementResult
 * @property {string} enhancedPrompt - The enhanced prompt
 * @property {boolean} wasEnhanced - Whether the prompt was enhanced
 * @property {Array} enhancements - List of enhancements applied
 * @property {Object} metadata - Additional metadata about the enhancement
 */

/**
 * Main function to enhance a prompt using rule-based approach
 * @param {string} rawPrompt - The raw prompt to enhance
 * @param {string} [context=''] - Optional context for the prompt
 * @returns {EnhancementResult} The enhancement result
 */
async function enhancePrompt(rawPrompt, context = "") {
  if (!rawPrompt || typeof rawPrompt !== 'string') {
    return {
      enhancedPrompt: rawPrompt || "",
      wasEnhanced: false,
      enhancements: [],
      metadata: {
        processingTime: 0,
        confidenceScore: 0
      }
    };
  }
  
  const startTime = Date.now();
  let currentPrompt = rawPrompt.trim();
  const appliedEnhancements = [];
  let wasEnhanced = false;
  const rulesApplied = [];
  
  // Step 1: Professional Title Correction (highest priority)
  if (needsTitleCorrection(currentPrompt) && ruleWeightLearner.shouldApplyRule('professionalTitle')) {
    const correctedPrompt = correctProfessionalTitles(currentPrompt);
    if (correctedPrompt !== currentPrompt) {
      const correctionInfo = getTitleCorrectionInfo(currentPrompt, correctedPrompt);
      appliedEnhancements.push(...correctionInfo.changes);
      currentPrompt = correctedPrompt;
      wasEnhanced = true;
      rulesApplied.push('professionalTitle');
      
      // Check specifically for 'cum' replacements
      if (rawPrompt.toLowerCase().includes(' cum ') && !correctedPrompt.toLowerCase().includes(' cum ')) {
        rulesApplied.push('cumReplacer');
      }
    }
  }
  
  // Step 2: Website Enhancement (if applicable)
  if (isWebsitePrompt(currentPrompt) && ruleWeightLearner.shouldApplyRule('domainSpecific')) {
    const enhancedWebsitePrompt = enhanceWebsitePrompt(currentPrompt);
    if (enhancedWebsitePrompt !== currentPrompt) {
      const websiteEnhancementInfo = getWebsiteEnhancementInfo(currentPrompt, enhancedWebsitePrompt);
      appliedEnhancements.push(...websiteEnhancementInfo.changes);
      currentPrompt = enhancedWebsitePrompt;
      wasEnhanced = true;
      rulesApplied.push('domainSpecific');
      
      // Detect domain specific rule types
      const lowerPrompt = currentPrompt.toLowerCase();
      if (lowerPrompt.includes('restaurant') || lowerPrompt.includes('menu') || 
          lowerPrompt.includes('food') || lowerPrompt.includes('dining')) {
        rulesApplied.push('restaurant');
      } else if (lowerPrompt.includes('university') || lowerPrompt.includes('courses') || 
                lowerPrompt.includes('professor') || lowerPrompt.includes('academic')) {
        rulesApplied.push('academic');
      }
    }
  }
  
  // Step 3: Apply learned pattern enhancements
  if (ruleWeightLearner.shouldApplyRule('patternLearned')) {
    const learnedEnhancedPrompt = patternLearner.enhancePromptWithLearned(currentPrompt);
    if (learnedEnhancedPrompt !== currentPrompt) {
      appliedEnhancements.push({
        type: 'learned.pattern_based',
        original: currentPrompt,
        enhanced: learnedEnhancedPrompt,
        description: 'Enhanced using learned patterns'
      });
      currentPrompt = learnedEnhancedPrompt;
      wasEnhanced = true;
      rulesApplied.push('patternLearned');
    }
  }
  
  // Calculate processing time
  const endTime = Date.now();
  const processingTime = endTime - startTime;
  
  // Calculate confidence score based on enhancements
  const confidenceScore = calculateConfidenceScore(appliedEnhancements, currentPrompt);
  
  return {
    enhancedPrompt: currentPrompt,
    wasEnhanced,
    enhancements: appliedEnhancements,
    metadata: {
      processingTime,
      confidenceScore,
      enhancementTypes: appliedEnhancements.map(e => e.type),
      rulesApplied
    }
  };
}

/**
 * Calculate a confidence score for the enhancement based on applied rules
 * @param {Array} enhancements - List of enhancements applied
 * @param {string} enhancedPrompt - The enhanced prompt
 * @returns {number} Confidence score between 0 and 1
 */
function calculateConfidenceScore(enhancements, enhancedPrompt) {
  if (enhancements.length === 0) return 0;
  
  // Base confidence starts at 0.7 (we applied at least one enhancement)
  let confidence = 0.7;
  
  // Add confidence for each enhancement type
  const enhancementTypes = new Set(enhancements.map(e => e.type.split('.')[0]));
  
  // More enhancement types means higher confidence
  confidence += enhancementTypes.size * 0.05;
  
  // Length increase is a good sign
  const lengthRatio = enhancedPrompt.length / (enhancements[0]?.original?.length || 1);
  if (lengthRatio > 1.5) confidence += 0.1;
  if (lengthRatio > 3) confidence += 0.1;
  
  // Cap confidence at 0.98
  return Math.min(0.98, confidence);
}

/**
 * Perform batch enhancement on multiple prompts
 * @param {Array<string>} prompts - Array of prompts to enhance
 * @returns {Array<EnhancementResult>} Array of enhancement results
 */
async function enhancePromptBatch(prompts) {
  if (!Array.isArray(prompts)) return [];
  
  const results = [];
  for (const prompt of prompts) {
    results.push(await enhancePrompt(prompt));
  }
  
  return results;
}

/**
 * Learn from feedback to improve future enhancements
 * Uses our new learning system to improve from feedback
 * @param {string} originalPrompt - The original prompt
 * @param {string} enhancedPrompt - The enhanced prompt
 * @param {boolean} wasSuccessful - Whether the enhancement was successful
 * @param {string} [feedback] - Optional feedback text
 */
async function learnFromFeedback(originalPrompt, enhancedPrompt, wasSuccessful, feedback) {
  console.log("Learning from feedback:", {
    originalPrompt,
    enhancedPrompt,
    wasSuccessful,
    feedback
  });
  
  // Convert wasSuccessful boolean to a rating (1-5)
  // If wasSuccessful is true, use 4.5, otherwise use 2.0
  const rating = wasSuccessful ? 4.5 : 2.0;
  
  // Learn patterns from this example if it was successful
  patternLearner.learnFromExample(originalPrompt, enhancedPrompt, wasSuccessful);
  
  // Update weights based on feedback
  // Try to guess which rules were applied
  const originalLower = originalPrompt.toLowerCase();
  const enhancedLower = enhancedPrompt.toLowerCase();
  
  // Update general pattern learned weight
  ruleWeightLearner.updateWeight('patternLearned', rating);
  
  // Check for 'cum' replacements
  if (originalLower.includes(' cum ') && !enhancedLower.includes(' cum ')) {
    ruleWeightLearner.updateWeight('cumReplacer', rating);
    ruleWeightLearner.updateWeight('professionalTitle', rating);
  }
  
  // Check for domain specific enhancements
  if (enhancedLower.includes('menu') || 
      enhancedLower.includes('restaurant') ||
      enhancedLower.includes('dining')) {
    ruleWeightLearner.updateWeight('restaurant', rating);
    ruleWeightLearner.updateWeight('domainSpecific', rating);
  }
  
  if (enhancedLower.includes('courses') || 
      enhancedLower.includes('faculty') ||
      enhancedLower.includes('academic')) {
    ruleWeightLearner.updateWeight('academic', rating);
    ruleWeightLearner.updateWeight('domainSpecific', rating);
  }
  
  if (enhancedLower.includes('professional') || 
      enhancedLower.includes('services') ||
      enhancedLower.includes('specialist')) {
    ruleWeightLearner.updateWeight('professionalTitle', rating);
  }
  
  return true;
}

module.exports = {
  enhancePrompt,
  enhancePromptBatch,
  learnFromFeedback
}; 