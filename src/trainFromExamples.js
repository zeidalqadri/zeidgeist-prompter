/**
 * Training Script
 * 
 * This script trains the prompt-enhancer system using the example dataset we created.
 */

const { trainFromFile } = require('./training/batchTrainer');
const patternLearner = require('./learning/patternLearner');
const path = require('path');

// Path to training examples
const TRAINING_FILE = path.join(__dirname, '../datasets/training_examples.json');

console.log(`Training from file: ${TRAINING_FILE}`);

try {
  const examplesProcessed = trainFromFile(TRAINING_FILE);
  console.log(`Successfully processed ${examplesProcessed} examples.`);
  
  if (examplesProcessed === 0) {
    console.error('No examples were processed. Check if the file exists and has the correct format.');
    console.log('The file should be an array of objects with the following structure:');
    console.log('  - original: The original prompt');
    console.log('  - enhanced: The enhanced prompt');
    console.log('  - rating: A number from 1 to 5 (higher is better)');
    console.log('  - ruleTypes: An array of rule types that were applied (optional)');
  } else {
    console.log('Training complete! The system has learned from the examples.');
    
    // Print the current state of the learned patterns
    const patterns = patternLearner.patterns;
    console.log('\nLearned patterns:');
    
    if (patterns.replacements && Object.keys(patterns.replacements).length > 0) {
      console.log('Replacements:');
      for (const [original, replacement] of Object.entries(patterns.replacements)) {
        console.log(`  "${original}" -> "${replacement}"`);
      }
    }
    
    if (patterns.additions) {
      console.log('\nDomain-specific additions:');
      for (const [domain, terms] of Object.entries(patterns.additions)) {
        if (Object.keys(terms).length > 0) {
          console.log(`  ${domain}:`);
          const topTerms = Object.entries(terms)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);
          
          for (const [term, count] of topTerms) {
            console.log(`    "${term}" (count: ${count})`);
          }
        }
      }
    }
  }
} catch (error) {
  console.error('Error during training:', error.message);
} 