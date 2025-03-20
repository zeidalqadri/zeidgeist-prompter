/**
 * Website Enhancement Rules
 * 
 * This module provides rules for enhancing website-related prompts 
 * by adding structure, specificity, and recommended components.
 */

/**
 * Website types and their recommended components
 */
const WEBSITE_TYPES = {
  general: {
    components: [
      'homepage with clear value proposition',
      'about section',
      'services or products offered',
      'contact information',
      'responsive design for mobile and desktop devices'
    ],
    verb: 'Design'
  },
  business: {
    components: [
      'homepage with clear value proposition',
      'about section',
      'services or products offered',
      'testimonials or reviews',
      'team or company information',
      'contact form',
      'responsive design for mobile and desktop devices'
    ],
    verb: 'Design'
  },
  portfolio: {
    components: [
      'homepage with featured work',
      'about/bio section',
      'project showcase with detailed descriptions',
      'skills or services offered',
      'testimonials or client feedback',
      'contact information',
      'responsive design optimized for visual content'
    ],
    verb: 'Create'
  },
  ecommerce: {
    components: [
      'homepage with featured products',
      'product catalog with categories',
      'product detail pages with descriptions and images',
      'shopping cart and checkout system',
      'customer reviews',
      'secure payment processing',
      'responsive design for mobile shopping'
    ],
    verb: 'Develop'
  },
  blog: {
    components: [
      'homepage with latest articles',
      'article categories or tags',
      'about the author section',
      'subscription or newsletter signup',
      'comment system',
      'responsive design for comfortable reading on all devices'
    ],
    verb: 'Create'
  },
  restaurant: {
    components: [
      'homepage with ambiance photos',
      'menu with prices',
      'location and hours',
      'reservation system or contact information',
      'about/story section',
      'responsive design for mobile customers'
    ],
    verb: 'Design'
  },
  educational: {
    components: [
      'homepage with clear mission',
      'course or program information',
      'faculty/staff profiles',
      'resources or learning materials',
      'registration or enrollment information',
      'responsive design for all devices'
    ],
    verb: 'Develop'
  },
  healthcare: {
    components: [
      'homepage with services overview',
      'provider profiles and credentials',
      'patient resources',
      'appointment scheduling',
      'insurance information',
      'contact and location details',
      'responsive design for accessibility'
    ],
    verb: 'Create'
  }
};

/**
 * Maps business or profession types to website types
 */
const BUSINESS_TO_WEBSITE_TYPE = {
  // Restaurants and food
  'restaurant': 'restaurant',
  'cafe': 'restaurant',
  'bakery': 'restaurant',
  'food': 'restaurant',
  'catering': 'restaurant',
  
  // Healthcare
  'doctor': 'healthcare',
  'dentist': 'healthcare',
  'orthodontist': 'healthcare',
  'surgeon': 'healthcare',
  'physician': 'healthcare',
  'clinic': 'healthcare',
  'hospital': 'healthcare',
  'pharmacy': 'healthcare',
  
  // Education
  'professor': 'educational',
  'teacher': 'educational',
  'school': 'educational',
  'university': 'educational',
  'college': 'educational',
  'tutor': 'educational',
  
  // Creative professionals
  'photographer': 'portfolio',
  'designer': 'portfolio',
  'artist': 'portfolio',
  'writer': 'portfolio',
  
  // Retail
  'shop': 'ecommerce',
  'store': 'ecommerce',
  'retail': 'ecommerce',
  'mall': 'ecommerce',
  
  // Service businesses
  'lawyer': 'business',
  'attorney': 'business',
  'accountant': 'business',
  'consultant': 'business',
  'agency': 'business'
};

/**
 * Special case website content recommendations for dual-role professionals
 */
const DUAL_ROLE_RECOMMENDATIONS = {
  'professor_healthcare': [
    'professional biography highlighting both academic credentials and clinical expertise',
    'academic section with research interests, publications, and teaching responsibilities',
    'clinical practice section with services offered, patient testimonials, and case studies',
    'integrated appointment system that distinguishes between academic and clinical appointments',
    'resources section with academic publications and patient educational materials',
    'contact information for both university department and clinical practice'
  ],
  'professor_lawyer': [
    'professional biography highlighting academic and legal expertise',
    'academic research and teaching information',
    'legal services and practice areas',
    'publications section organized by academic and legal writings',
    'case studies and academic projects',
    'separate contact information for academic and legal inquiries'
  ]
};

/**
 * Checks if a prompt is for a website and needs enhancement
 * @param {string} prompt - The prompt to check
 * @returns {boolean} True if enhancement is needed
 */
function isWebsitePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return false;
  
  const lowerPrompt = prompt.toLowerCase();
  return lowerPrompt.includes('website') || 
         lowerPrompt.includes('webpage') || 
         lowerPrompt.includes('web page') || 
         lowerPrompt.includes('site') || 
         lowerPrompt.includes('landing page');
}

/**
 * Detects if the prompt indicates a dual-role professional
 * @param {string} prompt - The prompt to check
 * @returns {string|null} The dual role key if detected, null otherwise
 */
function detectDualRole(prompt) {
  if (!prompt || typeof prompt !== 'string') return null;
  
  const lowerPrompt = prompt.toLowerCase();
  
  // Check for professor + healthcare professional
  if ((lowerPrompt.includes('professor') || lowerPrompt.includes('academic')) && 
      (lowerPrompt.includes('doctor') || lowerPrompt.includes('dentist') || 
       lowerPrompt.includes('orthodontist') || lowerPrompt.includes('surgeon') || 
       lowerPrompt.includes('physician'))) {
    return 'professor_healthcare';
  }
  
  // Check for professor + legal professional
  if ((lowerPrompt.includes('professor') || lowerPrompt.includes('academic')) && 
      (lowerPrompt.includes('lawyer') || lowerPrompt.includes('attorney') || 
       lowerPrompt.includes('legal'))) {
    return 'professor_lawyer';
  }
  
  return null;
}

/**
 * Detects the business or profession type from the prompt
 * @param {string} prompt - The prompt to check
 * @returns {string} The detected website type
 */
function detectBusinessType(prompt) {
  if (!prompt || typeof prompt !== 'string') return 'general';
  
  const lowerPrompt = prompt.toLowerCase();
  
  for (const [business, websiteType] of Object.entries(BUSINESS_TO_WEBSITE_TYPE)) {
    if (lowerPrompt.includes(business)) {
      return websiteType;
    }
  }
  
  return 'general';
}

/**
 * Enhances a website prompt with structure and specificity
 * @param {string} prompt - The prompt to enhance
 * @returns {string} The enhanced prompt
 */
function enhanceWebsitePrompt(prompt) {
  if (!prompt || typeof prompt !== 'string') return prompt;
  
  // Check if this is a dual-role professional
  const dualRole = detectDualRole(prompt);
  if (dualRole) {
    return enhanceDualRoleWebsitePrompt(prompt, dualRole);
  }
  
  // Detect business type and get corresponding website type
  const websiteType = detectBusinessType(prompt);
  const typeInfo = WEBSITE_TYPES[websiteType];
  
  // Extract the subject (what comes after "website for")
  let subject = prompt;
  if (prompt.toLowerCase().includes('website for')) {
    subject = prompt.substring(prompt.toLowerCase().indexOf('website for') + 'website for'.length).trim();
  } else if (prompt.toLowerCase().includes('website')) {
    subject = prompt.replace(/website/i, '').trim();
  }
  
  // Build enhanced prompt
  const enhancedPrompt = `${typeInfo.verb} a professional website for ${subject}. Include sections for ${typeInfo.components.join(', ')}.`;
  
  return enhancedPrompt;
}

/**
 * Enhances a website prompt for a dual-role professional
 * @param {string} prompt - The prompt to enhance
 * @param {string} dualRole - The detected dual role
 * @returns {string} The enhanced prompt
 */
function enhanceDualRoleWebsitePrompt(prompt, dualRole) {
  // Extract the subject (what comes after "website for")
  let subject = prompt;
  if (prompt.toLowerCase().includes('website for')) {
    subject = prompt.substring(prompt.toLowerCase().indexOf('website for') + 'website for'.length).trim();
  } else if (prompt.toLowerCase().includes('website')) {
    subject = prompt.replace(/website/i, '').trim();
  }
  
  // Get recommendations for the dual role
  const recommendations = DUAL_ROLE_RECOMMENDATIONS[dualRole];
  
  // Build enhanced prompt
  const enhancedPrompt = `Design a professional website for ${subject} that effectively showcases both professional roles. Include sections for ${recommendations.join(', ')}.`;
  
  return enhancedPrompt;
}

/**
 * Get information about the website enhancement
 * @param {string} originalPrompt - The original prompt
 * @param {string} enhancedPrompt - The enhanced prompt
 * @returns {Object} Object containing information about the enhancement
 */
function getWebsiteEnhancementInfo(originalPrompt, enhancedPrompt) {
  if (originalPrompt === enhancedPrompt) {
    return {
      enhanced: false,
      changes: []
    };
  }
  
  const changes = [
    {
      type: "content.specificity.detail_addition",
      original: originalPrompt,
      enhanced: enhancedPrompt,
      rationale: "Added specific website components and structure based on the website type"
    }
  ];
  
  // Check if there was a dual role enhancement
  if (detectDualRole(originalPrompt)) {
    changes.push({
      type: "special_case.professional_environment.title_correction",
      original: originalPrompt,
      enhanced: enhancedPrompt,
      rationale: "Enhanced prompt with dual professional role recommendations"
    });
  }
  
  return {
    enhanced: true,
    changes
  };
}

module.exports = {
  isWebsitePrompt,
  enhanceWebsitePrompt,
  getWebsiteEnhancementInfo,
  detectDualRole,
  WEBSITE_TYPES
}; 