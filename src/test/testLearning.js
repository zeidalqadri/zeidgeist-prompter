const patternLearner = require('../learning/patternLearner');
const ruleWeightLearner = require('../learning/ruleWeightLearner');
const { trainFromFile } = require('../training/batchTrainer');
const { enhancePrompt } = require('../prompt-enhancer');

async function runTests() {
  console.log('Testing learning system...');
  
  // Test pattern learning
  console.log('\nTesting pattern-based learning:');
  patternLearner.learnFromExample(
    "website for orthodontist cum associate professor",
    "website for orthodontist who is also an associate professor",
    true
  );
  
  const enhancedWithPattern = patternLearner.enhancePromptWithLearned(
    "website for dentist cum researcher"
  );
  console.log('Original: "website for dentist cum researcher"');
  console.log(`Enhanced: "${enhancedWithPattern}"`);
  
  // Test rule weight adjustment
  console.log('\nTesting rule weight adjustment:');
  const originalWeight = ruleWeightLearner.getWeight('professionalTitle');
  console.log(`Original weight for professionalTitle: ${originalWeight}`);
  
  // Simulate positive feedback
  ruleWeightLearner.updateWeight('professionalTitle', 5);
  console.log(`Weight after positive feedback: ${ruleWeightLearner.getWeight('professionalTitle')}`);
  
  // Simulate negative feedback
  ruleWeightLearner.updateWeight('professionalTitle', 1);
  console.log(`Weight after negative feedback: ${ruleWeightLearner.getWeight('professionalTitle')}`);
  
  // Test batch training from our examples file
  try {
    console.log('\nTrying to load training_examples.json for batch training test:');
    const count = trainFromFile('datasets/training_examples.json');
    console.log(`Processed ${count} examples`);
  } catch (e) {
    console.error('Error during batch training:', e.message);
  }
  
  // Test the full enhancer with learning
  try {
    console.log('\nTesting the full prompt enhancer with learning:');
    const testPrompt = "website for dentist cum professor at UCLA";
    console.log(`Original: "${testPrompt}"`);
    
    const result = await enhancePrompt(testPrompt);
    console.log(`Enhanced: "${result.enhancedPrompt}"`);
    console.log(`Rules applied: ${result.metadata.rulesApplied.join(', ')}`);
    console.log(`Confidence: ${result.metadata.confidenceScore}`);
  } catch (e) {
    console.error('Error testing enhancer:', e.message);
  }
  
  console.log('\nLearning system tests completed!');
}

// Run the tests
runTests(); 