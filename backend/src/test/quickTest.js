const { enhancePrompt } = require('../prompt-enhancer');

async function testEnhancer() {
  const testPrompts = [
    "website for lawyer cum fitness trainer",
    "website for pizza place in downtown",
    "website for psychology professor at Harvard",
    "website for dentist in New York specializing in cosmetic dentistry"
  ];
  
  console.log("Testing the prompt enhancer with different prompts:\n");
  
  for (const prompt of testPrompts) {
    console.log(`Original prompt: "${prompt}"`);
    const result = await enhancePrompt(prompt);
    console.log(`Enhanced prompt: "${result.enhancedPrompt}"`);
    console.log(`Rules applied: ${result.metadata.rulesApplied.join(', ')}`);
    console.log(`Confidence: ${result.metadata.confidenceScore}\n`);
  }
}

testEnhancer(); 