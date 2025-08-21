import { API_CONFIG } from './config.js';
import { StorageManager } from './storage.js';

export class PromptEnhancer {
  constructor() {
    this.storage = new StorageManager();
  }
  
  async enhance(prompt, context = null) {
    try {
      const cached = await this.storage.getCachedEnhancement(prompt);
      if (cached) {
        return cached;
      }
      
      const settings = await this.storage.getSettings();
      const authToken = await this.storage.getAuthToken();
      
      const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoints.enhance}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken && { 'Authorization': `Bearer ${authToken}` })
        },
        body: JSON.stringify({
          prompt,
          context,
          options: settings.enhancementOptions
        })
      });
      
      if (!response.ok) {
        throw new Error(`Enhancement failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      await this.storage.setCachedEnhancement(prompt, data);
      
      return data;
    } catch (error) {
      console.error('Enhancement error:', error);
      
      return this.localEnhancement(prompt, context);
    }
  }
  
  localEnhancement(prompt, context) {
    const enhanced = {
      original: prompt,
      refined: this.applyLocalRules(prompt, context),
      improvements: [],
      metrics: {
        clarity: 0,
        specificity: 0,
        completeness: 0
      }
    };
    
    enhanced.improvements = this.identifyImprovements(prompt, enhanced.refined);
    enhanced.metrics = this.calculateMetrics(prompt, enhanced.refined);
    
    return enhanced;
  }
  
  applyLocalRules(prompt, context) {
    let refined = prompt;
    
    refined = this.addClarity(refined);
    refined = this.improveSpecificity(refined);
    refined = this.addContext(refined, context);
    refined = this.structurePrompt(refined);
    
    return refined;
  }
  
  addClarity(prompt) {
    const vagueTerms = {
      'do something': 'perform the specific action',
      'make it better': 'improve the following aspects',
      'fix this': 'resolve the following issue',
      'help me': 'assist with',
      'something like': 'similar to',
      'kind of': 'approximately',
      'maybe': 'optionally',
      'stuff': 'items',
      'things': 'elements'
    };
    
    let refined = prompt;
    Object.entries(vagueTerms).forEach(([vague, clear]) => {
      const regex = new RegExp(`\\b${vague}\\b`, 'gi');
      refined = refined.replace(regex, clear);
    });
    
    return refined;
  }
  
  improveSpecificity(prompt) {
    const improvements = [];
    
    if (!prompt.includes('format') && this.needsFormatSpecification(prompt)) {
      improvements.push('Please provide the output in a structured format.');
    }
    
    if (!prompt.includes('example') && this.needsExample(prompt)) {
      improvements.push('Include relevant examples where applicable.');
    }
    
    if (!prompt.includes('step') && this.needsSteps(prompt)) {
      improvements.push('Break down the solution into clear steps.');
    }
    
    if (improvements.length > 0) {
      return `${prompt}\n\n${improvements.join(' ')}`;
    }
    
    return prompt;
  }
  
  addContext(prompt, context) {
    if (!context) return prompt;
    
    const contextPrefix = `Context: ${context}\n\n`;
    
    if (!prompt.toLowerCase().includes('context')) {
      return contextPrefix + prompt;
    }
    
    return prompt;
  }
  
  structurePrompt(prompt) {
    const sections = this.identifySections(prompt);
    
    if (sections.length <= 1) {
      return prompt;
    }
    
    let structured = '';
    sections.forEach((section, index) => {
      if (section.type === 'objective') {
        structured += `Objective:\n${section.content}\n\n`;
      } else if (section.type === 'constraints') {
        structured += `Constraints:\n${section.content}\n\n`;
      } else if (section.type === 'requirements') {
        structured += `Requirements:\n${section.content}\n\n`;
      } else {
        structured += `${section.content}\n\n`;
      }
    });
    
    return structured.trim();
  }
  
  identifySections(prompt) {
    const sections = [];
    const lines = prompt.split('\n');
    let currentSection = { type: 'general', content: '' };
    
    lines.forEach(line => {
      if (line.match(/^(objective|goal|purpose|aim):/i)) {
        if (currentSection.content) sections.push(currentSection);
        currentSection = { type: 'objective', content: line };
      } else if (line.match(/^(constraint|limitation|restriction):/i)) {
        if (currentSection.content) sections.push(currentSection);
        currentSection = { type: 'constraints', content: line };
      } else if (line.match(/^(requirement|need|must|should):/i)) {
        if (currentSection.content) sections.push(currentSection);
        currentSection = { type: 'requirements', content: line };
      } else {
        currentSection.content += (currentSection.content ? '\n' : '') + line;
      }
    });
    
    if (currentSection.content) sections.push(currentSection);
    
    return sections;
  }
  
  needsFormatSpecification(prompt) {
    const formatIndicators = ['list', 'table', 'json', 'csv', 'markdown', 'code'];
    return formatIndicators.some(indicator => prompt.toLowerCase().includes(indicator));
  }
  
  needsExample(prompt) {
    const exampleIndicators = ['how to', 'explain', 'demonstrate', 'show me'];
    return exampleIndicators.some(indicator => prompt.toLowerCase().includes(indicator));
  }
  
  needsSteps(prompt) {
    const stepIndicators = ['process', 'procedure', 'guide', 'tutorial', 'implement'];
    return stepIndicators.some(indicator => prompt.toLowerCase().includes(indicator));
  }
  
  identifyImprovements(original, refined) {
    const improvements = [];
    
    if (refined.length > original.length * 1.2) {
      improvements.push('Added structure and clarity');
    }
    
    if (refined.includes('Context:') && !original.includes('Context:')) {
      improvements.push('Added context section');
    }
    
    if (refined.includes('Objective:') && !original.includes('Objective:')) {
      improvements.push('Clarified objectives');
    }
    
    if (refined.split('\n').length > original.split('\n').length) {
      improvements.push('Improved formatting');
    }
    
    return improvements;
  }
  
  calculateMetrics(original, refined) {
    const metrics = {
      clarity: 0,
      specificity: 0,
      completeness: 0
    };
    
    const vagueWords = ['something', 'stuff', 'things', 'maybe', 'kind of'];
    const originalVague = vagueWords.filter(word => 
      original.toLowerCase().includes(word)
    ).length;
    const refinedVague = vagueWords.filter(word => 
      refined.toLowerCase().includes(word)
    ).length;
    
    metrics.clarity = Math.max(0, Math.min(100, 
      100 - (refinedVague * 20) + ((originalVague - refinedVague) * 10)
    ));
    
    const specificTerms = ['specifically', 'exactly', 'precisely', 'format', 'structure'];
    const specificCount = specificTerms.filter(term => 
      refined.toLowerCase().includes(term)
    ).length;
    
    metrics.specificity = Math.min(100, specificCount * 20 + 40);
    
    const sections = this.identifySections(refined);
    metrics.completeness = Math.min(100, sections.length * 25 + 25);
    
    return metrics;
  }
}