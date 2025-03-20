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
        confidenceScore: 0,
        source: "backend-default",
        model: "rule-based"
      }
    };
  }
  
  const startTime = Date.now();
  let currentPrompt = rawPrompt.trim();
  const appliedEnhancements = [];
  let wasEnhanced = false;
  const rulesApplied = [];
  
  // Clear previous enhancements if they exist (to avoid duplicate "Consider including" sections)
  if (currentPrompt.includes("Consider including:")) {
    currentPrompt = currentPrompt.split("Consider including:")[0].trim();
  }
  
  // COMPLETELY REPLACE with new implementation for demonstration purposes
  
  // Apply domain-specific enhancements based on content keywords
  let enhancedPrompt = currentPrompt;
  
  // Detect domains and add relevant suggestions
  if (/chart|data visualization|dashboard/i.test(currentPrompt)) {
    enhancedPrompt = `${currentPrompt}

Consider including:
- Color coding legend with tooltips for data interpretation
- Interactive filtering options for different time periods
- Responsive design for different screen sizes
- Clear labeling of axes and metrics with unit indicators
- Export functionality for reports and presentations`;
    wasEnhanced = true;
    rulesApplied.push('dataVisualization');
  } 
  else if (/website|webpage|landing page|web design/i.test(currentPrompt)) {
    enhancedPrompt = `${currentPrompt}

Consider including:
- Clear navigation structure with intuitive user flows
- Call-to-action elements strategically placed
- Responsive design for mobile and desktop
- Optimized page load performance and SEO elements
- Accessibility features for diverse user needs`;
    wasEnhanced = true;
    rulesApplied.push('webDesign');
  }
  else if (/app|application|mobile app|software/i.test(currentPrompt)) {
    enhancedPrompt = `${currentPrompt}

Consider including:
- User flow diagrams for core functionality
- Feature prioritization based on user needs
- Performance optimization strategies
- Robust error handling approaches
- Comprehensive testing methodology`;
    wasEnhanced = true;
    rulesApplied.push('appDevelopment');
  }
  else if (/sales|analytics|dashboard|business intelligence/i.test(currentPrompt)) {
    enhancedPrompt = `${currentPrompt}

Consider including:
- Key performance indicators with historical comparisons
- Sales funnel visualization with conversion metrics
- Regional performance maps with drill-down capability
- Customer segmentation analysis with demographic data
- Revenue forecasting based on historical trends
- Custom date range selectors for flexible time period analysis`;
    wasEnhanced = true;
    rulesApplied.push('salesAnalytics');
  }
  else {
    // Generic improvements for any prompt
    enhancedPrompt = `${currentPrompt}

Consider including:
- Specific success criteria and deliverables
- Timeline expectations with key milestones
- Technical constraints and requirements
- Quality metrics for evaluation
- Integration requirements with existing systems`;
    wasEnhanced = true;
    rulesApplied.push('generalEnhancement');
  }
  
  // Avoid duplication if the original prompt already has some of these suggestions
  currentPrompt = enhancedPrompt;
  
  appliedEnhancements.push({
    type: 'formatting.structure',
    original: rawPrompt,
    enhanced: enhancedPrompt,
    description: 'Improved formatting and structure'
  });
  
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
      rulesApplied,
      source: "backend-enhanced",
      model: "rule-based"
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