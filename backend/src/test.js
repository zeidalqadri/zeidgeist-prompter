/**
 * Test Script for Prompt Enhancer
 * 
 * This script tests the prompt enhancer with various test cases.
 */

const { enhancePrompt } = require('./prompt-enhancer');

// Test cases for the prompt enhancer
const TEST_CASES = [
  {
    name: "Professional Title with 'cum'",
    prompt: "website for orthodontist cum associate professor",
    expectedIncludes: ["who is also an", "associate professor"]
  },
  {
    name: "Professional Title with adjunct combination",
    prompt: "website for associate professor orthodontist", 
    expectedIncludes: ["associate professor and orthodontist"]
  },
  {
    name: "Restaurant Website",
    prompt: "website for kfc kl gateway",
    expectedIncludes: ["restaurant", "menu", "location"]
  },
  {
    name: "Academic Website",
    prompt: "website for university professor",
    expectedIncludes: ["educational", "faculty", "courses"]
  },
  {
    name: "Dual Role Professional",
    prompt: "website for professor dentist",
    expectedIncludes: ["both professional roles", "academic", "clinical"]
  },
  {
    name: "Generic Website",
    prompt: "website for business",
    expectedIncludes: ["professional website", "services"]
  }
];

/**
 * Run all test cases and output results
 */
async function runTests() {
  console.log("🧪 Running Prompt Enhancer Tests\n");
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of TEST_CASES) {
    process.stdout.write(`Testing: ${testCase.name}... `);
    
    try {
      const result = await enhancePrompt(testCase.prompt);
      
      // Check if enhancement happened
      if (!result.wasEnhanced) {
        console.log("❌ FAILED - No enhancement was applied");
        console.log(`  Original: "${testCase.prompt}"`);
        console.log(`  Result: "${result.enhancedPrompt}"`);
        failed++;
        continue;
      }
      
      // Check if all expected includes are present
      const missingIncludes = testCase.expectedIncludes.filter(
        text => !result.enhancedPrompt.toLowerCase().includes(text.toLowerCase())
      );
      
      if (missingIncludes.length > 0) {
        console.log("❌ FAILED - Missing expected content");
        console.log(`  Original: "${testCase.prompt}"`);
        console.log(`  Result: "${result.enhancedPrompt}"`);
        console.log(`  Missing: ${missingIncludes.join(', ')}`);
        failed++;
      } else {
        console.log("✅ PASSED");
        console.log(`  Original: "${testCase.prompt}"`);
        console.log(`  Enhanced: "${result.enhancedPrompt}"`);
        console.log(`  Types: ${result.metadata.enhancementTypes.join(', ')}`);
        passed++;
      }
    } catch (error) {
      console.log("❌ FAILED - Exception occurred");
      console.error(`  Error: ${error.message}`);
      failed++;
    }
    
    console.log(); // Empty line between test cases
  }
  
  // Output summary
  console.log("\n📊 Test Summary:");
  console.log(`  Total: ${TEST_CASES.length}`);
  console.log(`  Passed: ${passed}`);
  console.log(`  Failed: ${failed}`);
  
  if (failed === 0) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log(`\n❌ ${failed} test(s) failed.`);
  }
}

// Run the tests
runTests().catch(error => {
  console.error("Error running tests:", error);
}); 