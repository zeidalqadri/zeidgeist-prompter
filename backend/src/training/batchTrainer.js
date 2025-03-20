const fs = require('fs');
const path = require('path');
const patternLearner = require('../learning/patternLearner');
const ruleWeightLearner = require('../learning/ruleWeightLearner');

/**
 * Train the system from a JSON file containing examples
 * @param {string} filePath - Path to the training file
 * @returns {number} Number of successfully processed examples
 */
function trainFromFile(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const examples = JSON.parse(data);
    
    console.log(`Loading ${examples.length} training examples...`);
    
    let successCount = 0;
    for (const example of examples) {
      try {
        // Support both our schema format and simple format
        const original = example.original || example.raw_prompt;
        const enhanced = example.enhanced || example.enhanced_prompt;
        const rating = example.rating || (example.metadata && example.metadata.effectiveness_rating) || 4;
        
        if (original && enhanced) {
          // Determine if this is a positive example (rating > 3)
          const isPositive = rating > 3;
          
          // Learn patterns from this example
          patternLearner.learnFromExample(
            original, 
            enhanced, 
            isPositive
          );
          
          // Update rule weights based on the rating
          if (example.ruleTypes && Array.isArray(example.ruleTypes)) {
            for (const ruleType of example.ruleTypes) {
              ruleWeightLearner.updateWeight(ruleType, rating);
            }
          } else {
            // If ruleTypes not specified, update general weights
            guessAndUpdateRuleWeights(original, enhanced, rating);
          }
          
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing example: ${error.message}`);
      }
    }
    
    console.log(`Successfully processed ${successCount} examples`);
    return successCount;
  } catch (error) {
    console.error(`Failed to load training file: ${error.message}`);
    return 0;
  }
}

/**
 * Try to guess which rules were applied and update their weights
 */
function guessAndUpdateRuleWeights(original, enhanced, rating) {
  // Update general weight for pattern learned enhancements
  ruleWeightLearner.updateWeight('patternLearned', rating);
  
  // Try to detect specific rule types
  const originalLower = original.toLowerCase();
  const enhancedLower = enhanced.toLowerCase();
  
  // Check for 'cum' replacements
  if (originalLower.includes(' cum ') && !enhancedLower.includes(' cum ')) {
    ruleWeightLearner.updateWeight('cumReplacer', rating);
  }
  
  // Check for domain specific enhancements
  if (enhancedLower.includes('menu') || 
      enhancedLower.includes('restaurant') ||
      enhancedLower.includes('dining')) {
    ruleWeightLearner.updateWeight('restaurant', rating);
  }
  
  if (enhancedLower.includes('courses') || 
      enhancedLower.includes('faculty') ||
      enhancedLower.includes('academic')) {
    ruleWeightLearner.updateWeight('academic', rating);
  }
  
  if (enhancedLower.includes('professional') || 
      enhancedLower.includes('services') ||
      enhancedLower.includes('specialist')) {
    ruleWeightLearner.updateWeight('professionalTitle', rating);
  }
}

module.exports = { trainFromFile }; 