const fs = require('fs');
const path = require('path');

class RuleWeightLearner {
  constructor() {
    this.weightsPath = path.join(__dirname, '../data/rule_weights.json');
    this.ruleWeights = this.loadWeights();
    this.learningRate = 0.1;
  }
  
  loadWeights() {
    try {
      return JSON.parse(fs.readFileSync(this.weightsPath, 'utf8'));
    } catch (error) {
      console.log('Creating new rule weights');
      return {
        professionalTitle: 1.0,
        restaurant: 1.0,
        academic: 1.0,
        cumReplacer: 1.0,
        domainSpecific: 1.0,
        patternLearned: 1.0
      };
    }
  }
  
  saveWeights() {
    const dir = path.dirname(this.weightsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.weightsPath, JSON.stringify(this.ruleWeights, null, 2));
    console.log('Rule weights saved');
  }
  
  updateWeight(ruleType, feedback) {
    // Make sure the rule exists
    if (!this.ruleWeights[ruleType]) {
      this.ruleWeights[ruleType] = 1.0;
    }
    
    // Convert feedback rating (1-5) to a weight adjustment
    const adjustment = ((feedback - 3) / 2) * this.learningRate;
    
    // Update the weight
    this.ruleWeights[ruleType] = Math.max(0.1, 
      Math.min(2.0, this.ruleWeights[ruleType] + adjustment));
      
    console.log(`Updated weight for ${ruleType}: ${this.ruleWeights[ruleType]}`);
    this.saveWeights();
    return this.ruleWeights[ruleType];
  }
  
  getWeight(ruleType) {
    return this.ruleWeights[ruleType] || 1.0;
  }
  
  // Function to apply weights in a probabilistic manner
  shouldApplyRule(ruleType) {
    const weight = this.getWeight(ruleType);
    // Weight becomes a probability of applying the rule
    return Math.random() < weight;
  }
}

module.exports = new RuleWeightLearner(); 