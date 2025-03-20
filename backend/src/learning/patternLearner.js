const fs = require('fs');
const path = require('path');

class PatternLearner {
  constructor() {
    this.patternsPath = path.join(__dirname, '../data/learned_patterns.json');
    this.patterns = this.loadPatterns();
  }

  loadPatterns() {
    try {
      return JSON.parse(fs.readFileSync(this.patternsPath, 'utf8'));
    } catch (error) {
      console.log('Creating new patterns database');
      return {
        replacements: {},
        additions: {},
        domains: {
          restaurant: ['menu', 'order', 'location', 'hours', 'delivery'],
          academic: ['courses', 'publications', 'research', 'faculty', 'curriculum'],
          professional: ['services', 'credentials', 'experience', 'testimonials', 'appointment'],
          // Add more domains as needed
        }
      };
    }
  }

  savePatterns() {
    const dir = path.dirname(this.patternsPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.patternsPath, JSON.stringify(this.patterns, null, 2));
    console.log('Pattern database saved');
  }

  detectDomain(prompt) {
    const promptLower = prompt.toLowerCase();
    // Domain detection
    if (/restaurant|cafe|diner|eatery|food|kfc|mcdonalds|pizza|bistro/i.test(promptLower)) {
      return 'restaurant';
    } else if (/university|professor|academic|college|school|education|courses|faculty/i.test(promptLower)) {
      return 'academic';
    } else if (/doctor|lawyer|dentist|orthodontist|consultant|professional/i.test(promptLower)) {
      return 'professional';
    }
    return 'general'; // Default domain
  }

  learnFromExample(originalPrompt, enhancedPrompt, positiveRating = true) {
    if (!positiveRating) return; // Only learn from positive examples
    
    // Learn word replacements
    const origWords = originalPrompt.toLowerCase().split(/\s+/);
    const enhancedWords = enhancedPrompt.toLowerCase().split(/\s+/);
    
    // Simple addition detection (terms in enhanced not in original)
    const newTerms = enhancedWords.filter(word => 
      !origWords.includes(word) && word.length > 3);
    
    // Store domain-specific additions
    if (newTerms.length > 0) {
      const domain = this.detectDomain(originalPrompt);
      if (!this.patterns.additions[domain]) {
        this.patterns.additions[domain] = {};
      }
      
      for (const term of newTerms) {
        this.patterns.additions[domain][term] = 
          (this.patterns.additions[domain][term] || 0) + 1;
        
        // Also add to domain keywords for future detection
        if (!this.patterns.domains[domain]) {
          this.patterns.domains[domain] = [];
        }
        if (!this.patterns.domains[domain].includes(term) && 
            this.patterns.additions[domain][term] > 2) {
          this.patterns.domains[domain].push(term);
        }
      }
    }

    // Learn specific replacements
    this.learnPhraseReplacements(originalPrompt, enhancedPrompt);
    
    this.savePatterns();
    return true;
  }
  
  learnPhraseReplacements(original, enhanced) {
    // Special case: Learn "cum" replacement
    const cumMatch = original.match(/(\w+)\s+cum\s+(\w+)/i);
    if (cumMatch) {
      const [fullMatch, word1, word2] = cumMatch;
      const enhancedLower = enhanced.toLowerCase();
      
      // Check if original "cum" is replaced in enhanced version
      if (!enhancedLower.includes('cum')) {
        // Try to extract the replacement pattern
        const connectorPattern = new RegExp(
          `${word1}\\s+(\\w+\\s+\\w+\\s+\\w+)\\s+${word2}`, 'i');
        const connectorMatch = enhanced.match(connectorPattern);
        
        if (connectorMatch) {
          const replacement = connectorMatch[1];
          this.patterns.replacements['cum'] = replacement;
        } else {
          // Default replacement if pattern not detected
          this.patterns.replacements['cum'] = 'who is also an';
        }
      }
    }
  }
  
  enhancePromptWithLearned(prompt) {
    const domain = this.detectDomain(prompt);
    let enhanced = prompt;
    
    // Apply learned replacements
    for (const [original, replacement] of Object.entries(this.patterns.replacements)) {
      if (original === 'cum') {
        enhanced = enhanced.replace(/(\w+)\s+cum\s+(\w+)/gi, `$1 ${replacement} $2`);
      } else {
        const regex = new RegExp(original, 'gi');
        enhanced = enhanced.replace(regex, replacement);
      }
    }
    
    // Apply learned domain-specific additions
    if (domain && this.patterns.additions[domain]) {
      const relevantTerms = Object.entries(this.patterns.additions[domain])
        .filter(([_, count]) => count > 2) // Only use terms that appeared multiple times
        .map(([term, _]) => term)
        .sort(() => 0.5 - Math.random()) // Randomize order
        .slice(0, 3); // Take just a few terms
      
      if (relevantTerms.length > 0) {
        enhanced += ` Consider including sections for ${relevantTerms.join(', ')}.`;
      }
    }
    
    return enhanced;
  }
}

module.exports = new PatternLearner(); 