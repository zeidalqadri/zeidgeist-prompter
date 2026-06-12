// Local prompt enhancement engine (fallback when external APIs are unavailable)
// This provides intelligent prompt enhancement using pattern matching and templates

import { trainingExamples } from './training-data'

interface EnhancementPattern {
  keywords: string[]
  template: (prompt: string, context?: string) => string
  priority: number
}

// Enhancement patterns based on common prompt types
const enhancementPatterns: EnhancementPattern[] = [
  {
    keywords: ['website', 'site', 'webpage', 'web'],
    priority: 10,
    template: (prompt, context) => {
      const subject = extractSubject(prompt)
      let enhanced = `Design a professional website for ${subject} that includes:`

      // Add context-specific elements
      if (context?.toLowerCase().includes('doctor') || context?.toLowerCase().includes('medical') || prompt.toLowerCase().includes('doctor')) {
        enhanced += `
1. Professional homepage showcasing medical expertise and credentials
2. Detailed services and treatment information with patient education
3. Easy appointment booking system with online scheduling
4. Patient portal for forms, results, and communication
5. About section highlighting experience, education, and specializations
6. Contact information with office hours, location, and directions
7. Insurance and payment information for patient convenience
8. Mobile-responsive design ensuring accessibility and professionalism`
      } else if (context?.toLowerCase().includes('business') || prompt.toLowerCase().includes('business')) {
        enhanced += `
1. Compelling homepage that clearly communicates your value proposition
2. Comprehensive services or products section with detailed descriptions
3. About page showcasing company story, mission, and team credentials
4. Portfolio or case studies demonstrating expertise and results
5. Client testimonials and reviews building trust and credibility
6. Contact information with multiple communication channels
7. Professional blog or resources section for thought leadership
8. Mobile-optimized design with fast loading and intuitive navigation`
      } else {
        enhanced += `
1. Engaging homepage that clearly communicates purpose and value
2. Comprehensive content sections organized logically and intuitively
3. About section providing background, credentials, and unique story
4. Portfolio, services, or products showcase with detailed information
5. Testimonials or reviews from satisfied customers or users
6. Easy-to-find contact information and communication options
7. Professional design that reflects brand identity and builds trust
8. Mobile-responsive layout ensuring excellent user experience across devices`
      }

      if (context) {
        enhanced += `\n\nAdditional considerations based on context: ${context}`
      }

      return enhanced
    }
  },
  {
    keywords: ['write', 'essay', 'article', 'blog', 'content', 'paper'],
    priority: 9,
    template: (prompt, context) => {
      let enhanced = `${prompt} with the following comprehensive structure:`

      enhanced += `
1. Compelling introduction that hooks readers and clearly states the main thesis or purpose
2. Well-researched body content organized into logical sections with clear headings
3. Supporting evidence including data, expert opinions, examples, and credible sources
4. Smooth transitions between paragraphs and sections maintaining coherent flow
5. Engaging writing style appropriate for the target audience and publication medium
6. Visual elements like subheadings, bullet points, or graphics to enhance readability
7. Strong conclusion that summarizes key points and provides actionable insights or next steps
8. Proper citations and references following appropriate academic or professional standards`

      if (context) {
        enhanced += `\n\nContext-specific requirements: Tailor the content considering ${context}, ensuring all information is relevant and valuable to readers in this specific domain.`
      }

      return enhanced
    }
  },
  {
    keywords: ['design', 'create', 'build', 'develop', 'make'],
    priority: 8,
    template: (prompt, context) => {
      let enhanced = `${prompt} with careful attention to:`

      enhanced += `
1. Clear project scope and objectives with well-defined deliverables and success criteria
2. Target audience analysis ensuring the solution meets specific user needs and preferences
3. Professional aesthetic that aligns with brand identity and industry standards
4. Functional requirements including essential features, user flows, and technical specifications
5. User experience optimization with intuitive navigation and accessibility considerations
6. Quality assurance through testing, feedback collection, and iterative refinement
7. Timeline and resource planning with realistic milestones and deliverable schedules
8. Future scalability and maintenance considerations for long-term sustainability`

      if (context) {
        enhanced += `\n\nSpecialized requirements: Given the context of ${context}, ensure all design decisions support the specific goals and constraints of this domain.`
      }

      return enhanced
    }
  },
  {
    keywords: ['plan', 'strategy', 'organize', 'manage'],
    priority: 7,
    template: (prompt, context) => {
      let enhanced = `${prompt} using a systematic approach that includes:`

      enhanced += `
1. Comprehensive assessment of current situation, resources, and constraints
2. Clear goal setting with specific, measurable, achievable, relevant, and time-bound objectives
3. Detailed action plan with prioritized tasks, responsibilities, and timelines
4. Resource allocation including budget planning, personnel assignment, and tool selection
5. Risk assessment and mitigation strategies for potential challenges or obstacles
6. Progress tracking mechanisms with regular checkpoints and performance indicators
7. Communication plan ensuring all stakeholders are informed and aligned
8. Contingency planning for alternative approaches if original plans need adjustment`

      if (context) {
        enhanced += `\n\nContext-specific considerations: Adapt the planning approach to address the unique requirements and challenges presented by ${context}.`
      }

      return enhanced
    }
  },
  {
    keywords: ['learn', 'study', 'education', 'training', 'skill'],
    priority: 6,
    template: (prompt, context) => {
      let enhanced = `${prompt} through a structured learning approach that encompasses:`

      enhanced += `
1. Learning objective definition with clear goals and measurable outcomes
2. Comprehensive curriculum planning covering foundational concepts to advanced applications
3. Diverse resource utilization including books, online courses, tutorials, and practical exercises
4. Hands-on practice with real-world projects and problem-solving scenarios
5. Regular assessment and feedback to track progress and identify areas for improvement
6. Community engagement through forums, study groups, or mentorship opportunities
7. Practical application in projects or work situations to reinforce learning
8. Continuous learning mindset with staying updated on new developments and best practices`

      if (context) {
        enhanced += `\n\nSpecialized focus: Tailor the learning path to excel in ${context}, emphasizing the most relevant skills and knowledge areas for this field.`
      }

      return enhanced
    }
  }
]

// Extract the main subject from a prompt
function extractSubject(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase()

  // Look for "for X" pattern
  if (prompt.includes(' for ')) {
    return prompt.split(' for ')[1].trim()
  }

  // Look for "about X" pattern
  if (prompt.includes(' about ')) {
    return prompt.split(' about ')[1].trim()
  }

  // Look for common patterns
  if (lowerPrompt.includes('website')) {
    return prompt.replace(/website|site|webpage/gi, '').trim()
  }

  // Default: return the original prompt
  return prompt
}

// Find the best matching enhancement pattern
function findBestPattern(prompt: string, context?: string): EnhancementPattern | null {
  const searchText = `${prompt} ${context || ''}`.toLowerCase()

  let bestMatch: EnhancementPattern | null = null
  let bestScore = 0

  for (const pattern of enhancementPatterns) {
    let score = 0
    for (const keyword of pattern.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += pattern.priority
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = pattern
    }
  }

  return bestMatch
}

// Find similar examples from training data
function findSimilarTrainingExample(prompt: string): string | null {
  const lowerPrompt = prompt.toLowerCase()

  for (const example of trainingExamples) {
    const lowerRaw = example.rawPrompt.toLowerCase()

    // Check for keyword overlap
    const promptWords = lowerPrompt.split(' ')
    const exampleWords = lowerRaw.split(' ')

    const overlap = promptWords.filter(word =>
      word.length > 3 && exampleWords.includes(word)
    ).length

    // If there's significant overlap, use this example as inspiration
    if (overlap >= 2) {
      return example.enhancedPrompt
    }
  }

  return null
}

// Generic enhancement for prompts that don't match specific patterns
function generateGenericEnhancement(prompt: string, context?: string): string {
  let enhanced = `${prompt}. Ensure comprehensive coverage including:`

  enhanced += `
1. Clear scope and objectives with well-defined deliverables
2. Thorough research and evidence-based approach
3. Professional quality and attention to detail
4. Logical organization and intuitive structure
5. Audience-appropriate tone and presentation
6. Practical implementation considerations
7. Quality assurance and validation methods
8. Future sustainability and maintenance planning`

  if (context) {
    enhanced += `\n\nAdditional context: Consider the specific requirements and constraints related to ${context} when implementing this solution.`
  }

  return enhanced
}

// Main enhancement function
export async function enhancePrompt(prompt: string, context?: string): Promise<string> {
  try {
    // Validate input
    if (!prompt || typeof prompt !== 'string') {
      return 'Please provide a valid prompt to enhance.'
    }

    const trimmedPrompt = prompt.trim()
    const trimmedContext = context?.trim()

    if (!trimmedPrompt) {
      return 'Please provide a non-empty prompt to enhance.'
    }

    // First, try to find a similar training example
    const similarExample = findSimilarTrainingExample(trimmedPrompt)
    if (similarExample) {
      // Use the training example as a template but adapt it to the current prompt
      const adaptedExample = similarExample.replace(/Design a professional website.*?includes:/,
        `${trimmedPrompt} with comprehensive planning that includes:`)
      return adaptedExample
    }

    // Try to find a matching pattern
    const bestPattern = findBestPattern(trimmedPrompt, trimmedContext)
    if (bestPattern) {
      return bestPattern.template(trimmedPrompt, trimmedContext)
    }

    // Fall back to generic enhancement
    return generateGenericEnhancement(trimmedPrompt, trimmedContext)

  } catch (error) {
    console.error('Local enhancement error:', error)

    // Last resort: return the original prompt with minimal enhancement
    return `${prompt}. Include comprehensive details, clear structure, and professional execution.`
  }
}