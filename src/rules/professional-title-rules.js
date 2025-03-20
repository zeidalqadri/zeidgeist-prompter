/**
 * Professional Title Handling Rules
 * 
 * This module provides rules for detecting and correcting professional title 
 * combinations in prompts to ensure they are properly formatted.
 */

/**
 * List of professional titles that should be handled specially
 */
const PROFESSIONAL_TITLES = [
  'professor',
  'doctor',
  'dr',
  'phd',
  'md',
  'attorney',
  'lawyer',
  'counsel',
  'dentist',
  'orthodontist',
  'surgeon',
  'physician',
  'psychologist',
  'therapist',
  'pharmacist',
  'nurse',
  'scientist',
  'researcher'
];

/**
 * List of academic/professional positions
 */
const POSITIONS = [
  'associate',
  'assistant',
  'adjunct',
  'visiting',
  'clinical',
  'research',
  'emeritus',
  'senior',
  'junior',
  'chief',
  'head',
  'lead',
  'principal'
];

/**
 * Problematic conjunctions that should be replaced
 */
const PROBLEMATIC_CONJUNCTIONS = {
  'cum': 'who is also an',
  'vs': 'versus',
  'versus': 'versus'
};

/**
 * Builds regex patterns for detecting professional title combinations
 * @returns {Object} Object containing regex patterns
 */
function buildPatterns() {
  // Escape special regex characters in titles and positions
  const escapedTitles = PROFESSIONAL_TITLES.map(title => title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const escapedPositions = POSITIONS.map(position => position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  
  // Join titles with OR operator for regex
  const titlesPattern = escapedTitles.join('|');
  const positionsPattern = escapedPositions.join('|');
  
  // Build patterns
  return {
    // Pattern for "title1 conjunction title2"
    titleConjunctionTitle: new RegExp(`\\b(${titlesPattern})\\s+(${Object.keys(PROBLEMATIC_CONJUNCTIONS).join('|')})\\s+(${titlesPattern})\\b`, 'gi'),
    
    // Pattern for "title1 title2" (no conjunction)
    titleTitle: new RegExp(`\\b(${titlesPattern})\\s+(${titlesPattern})\\b`, 'gi'),
    
    // Pattern for "position title1 title2"
    positionTitleTitle: new RegExp(`\\b(${positionsPattern})\\s+(${titlesPattern})\\s+(${titlesPattern})\\b`, 'gi'),
    
    // Pattern for "title1 position title2"
    titlePositionTitle: new RegExp(`\\b(${titlesPattern})\\s+(${positionsPattern})\\s+(${titlesPattern})\\b`, 'gi')
  };
}

/**
 * Checks if a prompt contains professional title patterns that need correction
 * @param {string} prompt - The prompt to check
 * @returns {boolean} True if corrections are needed
 */
function needsTitleCorrection(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  
  const patterns = buildPatterns();
  
  return patterns.titleConjunctionTitle.test(prompt) || 
         patterns.titleTitle.test(prompt) || 
         patterns.positionTitleTitle.test(prompt) || 
         patterns.titlePositionTitle.test(prompt);
}

/**
 * Corrects professional title combinations in a prompt
 * @param {string} prompt - The prompt to correct
 * @returns {string} The corrected prompt
 */
function correctProfessionalTitles(prompt) {
  if (!prompt || typeof prompt !== 'string') return prompt;
  
  const patterns = buildPatterns();
  let correctedPrompt = prompt;
  
  // Replace "title1 conjunction title2" with "title1 conjunction title2"
  correctedPrompt = correctedPrompt.replace(patterns.titleConjunctionTitle, (match, title1, conjunction, title2) => {
    const replacementConjunction = PROBLEMATIC_CONJUNCTIONS[conjunction.toLowerCase()] || conjunction;
    return `${title1} ${replacementConjunction} ${title2}`;
  });
  
  // Replace "title1 title2" with "title1 and title2"
  correctedPrompt = correctedPrompt.replace(patterns.titleTitle, (match, title1, title2) => {
    // Avoid replacing if titles are the same or part of a larger title
    if (title1.toLowerCase() === title2.toLowerCase()) return match;
    return `${title1} and ${title2}`;
  });
  
  // Replace "position title1 title2" with "position title1 and title2"
  correctedPrompt = correctedPrompt.replace(patterns.positionTitleTitle, (match, position, title1, title2) => {
    return `${position} ${title1} and ${title2}`;
  });
  
  // Replace "title1 position title2" with "title1 and position title2"
  correctedPrompt = correctedPrompt.replace(patterns.titlePositionTitle, (match, title1, position, title2) => {
    return `${title1} and ${position} ${title2}`;
  });
  
  return correctedPrompt;
}

/**
 * Get information about the corrections made to professional titles
 * @param {string} originalPrompt - The original prompt
 * @param {string} correctedPrompt - The corrected prompt
 * @returns {Object} Object containing information about corrections
 */
function getTitleCorrectionInfo(originalPrompt, correctedPrompt) {
  if (originalPrompt === correctedPrompt) {
    return {
      corrected: false,
      changes: []
    };
  }
  
  return {
    corrected: true,
    changes: [
      {
        type: "special_case.professional_environment.title_correction",
        original: originalPrompt,
        enhanced: correctedPrompt,
        rationale: "Corrected professional title combinations for clarity and professionalism"
      }
    ]
  };
}

module.exports = {
  needsTitleCorrection,
  correctProfessionalTitles,
  getTitleCorrectionInfo,
  PROFESSIONAL_TITLES,
  POSITIONS
}; 