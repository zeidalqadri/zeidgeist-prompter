import { NextRequest, NextResponse } from "next/server"
import { enhancePrompt } from "../../lib/llm-enhancer"
import { db, enhancementLogs, NewEnhancementLog } from "../../lib/db"

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    const body = await request.json()
    const { prompt, context, isRefinement, isExpansion, repeatCount } = body

    // Enhanced input validation
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ 
        error: "Please provide a valid prompt to enhance." 
      }, { status: 400 })
    }

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      return NextResponse.json({ 
        error: "Prompt cannot be empty. Please enter some text to enhance." 
      }, { status: 400 })
    }

    // Log request for monitoring
    console.log('Enhancement request:', {
      promptLength: trimmedPrompt.length,
      hasContext: !!context,
      isRefinement: !!isRefinement,
      isExpansion: !!isExpansion,
      repeatCount: repeatCount || 0,
      timestamp: new Date().toISOString()
    })

    // Process the prompt using our LLM-based enhancer
    try {
      const enhancedPrompt = await enhancePrompt(
        trimmedPrompt, 
        context || "", 
        isRefinement || isExpansion
      )
      
      const processingTime = Date.now() - startTime
      
      // CRITICAL: Verify the enhancedPrompt is actually different from the input
      if (enhancedPrompt === trimmedPrompt) {
        console.warn("Enhancement returned identical prompt, applying intelligent fallback")
        
        // Apply intelligent fallback based on prompt analysis
        const fallbackEnhanced = generateIntelligentFallback(trimmedPrompt, context, {
          isRefinement: !!isRefinement,
          isExpansion: !!isExpansion,
          repeatCount: repeatCount || 0
        })
        
        // Log fallback enhancement to database
        try {
          const enhancementLog: NewEnhancementLog = {
            promptLength: trimmedPrompt.length,
            hasContext: !!context,
            isRefinement: !!isRefinement,
            isExpansion: !!isExpansion,
            repeatCount: repeatCount || 0,
            source: 'fallback',
            processingTime,
            wasIdentical: true,
            hadError: false
          }
          await db.insert(enhancementLogs).values(enhancementLog)
        } catch (logError) {
          console.error("Failed to log fallback enhancement:", logError)
        }

        return NextResponse.json({ 
          result: fallbackEnhanced,
          metadata: {
            source: 'fallback',
            processingTime,
            wasIdentical: true
          }
        })
      }
      
      // Determine the source of enhancement for user feedback
      let source = 'unknown'
      if (enhancedPrompt.includes('Design a professional website') || 
          enhancedPrompt.includes('comprehensive approach')) {
        source = 'local'
      } else {
        source = 'external-api' // DeepSeek, Mistral, or Gemini
      }
      
      // Log enhancement to database for analytics
      try {
        const enhancementLog: NewEnhancementLog = {
          promptLength: trimmedPrompt.length,
          hasContext: !!context,
          isRefinement: !!isRefinement,
          isExpansion: !!isExpansion,
          repeatCount: repeatCount || 0,
          source,
          processingTime,
          wasIdentical: false,
          hadError: false
        }
        await db.insert(enhancementLogs).values(enhancementLog)
      } catch (logError) {
        console.error("Failed to log enhancement:", logError)
      }

      return NextResponse.json({ 
        result: enhancedPrompt,
        metadata: {
          source,
          processingTime,
          originalLength: trimmedPrompt.length,
          enhancedLength: enhancedPrompt.length
        }
      })
    } catch (enhancementError) {
      console.error("Error enhancing prompt:", enhancementError)
      
      const processingTime = Date.now() - startTime
      
      // Provide user-friendly error handling with intelligent fallback
      const fallbackEnhanced = generateIntelligentFallback(trimmedPrompt, context, {
        isRefinement: !!isRefinement,
        isExpansion: !!isExpansion,
        repeatCount: repeatCount || 0,
        hasError: true
      })
      
      // Log error enhancement to database
      try {
        const enhancementLog: NewEnhancementLog = {
          promptLength: trimmedPrompt.length,
          hasContext: !!context,
          isRefinement: !!isRefinement,
          isExpansion: !!isExpansion,
          repeatCount: repeatCount || 0,
          source: 'fallback-error',
          processingTime,
          wasIdentical: false,
          hadError: true
        }
        await db.insert(enhancementLogs).values(enhancementLog)
      } catch (logError) {
        console.error("Failed to log error enhancement:", logError)
      }

      return NextResponse.json({ 
        result: fallbackEnhanced,
        metadata: {
          source: 'fallback-error',
          processingTime,
          hadError: true
        }
      })
    }
  } catch (error) {
    console.error("Critical error processing request:", error)
    
    const processingTime = Date.now() - startTime
    
    // Log critical error to database
    try {
      const enhancementLog: NewEnhancementLog = {
        promptLength: 0, // Unknown due to error
        hasContext: false,
        isRefinement: false,
        isExpansion: false,
        repeatCount: 0,
        source: 'error-handler',
        processingTime,
        wasIdentical: false,
        hadError: true
      }
      await db.insert(enhancementLogs).values(enhancementLog)
    } catch (logError) {
      console.error("Failed to log critical error:", logError)
    }
    
    // Graceful error handling with user-friendly message
    return NextResponse.json({
      result: "I'm having trouble processing your request right now. Please try rephrasing your prompt or try again in a moment.",
      metadata: {
        source: 'error-handler',
        processingTime,
        hadCriticalError: true
      }
    }, { status: 200 }) // Use 200 to avoid showing error UI
  }
}

// Generate intelligent fallback enhancements based on prompt analysis
function generateIntelligentFallback(
  prompt: string, 
  context?: string, 
  options: {
    isRefinement?: boolean
    isExpansion?: boolean
    repeatCount?: number
    hasError?: boolean
  } = {}
): string {
  const lowerPrompt = prompt.toLowerCase()
  const { isRefinement, isExpansion, repeatCount = 0 } = options
  
  // For expansions/refinements, provide more substantial enhancements
  const expansionLevel = isExpansion && repeatCount > 0 ? repeatCount : 0
  
  // Website-specific enhancement
  if (lowerPrompt.includes('website') || lowerPrompt.includes('site') || lowerPrompt.includes('web')) {
    const subject = prompt.replace(/website|site|web/gi, '').replace(/for|about/, '').trim()
    
    if (expansionLevel > 0) {
      return `Create a comprehensive digital presence for ${subject} including: a professionally designed website with intuitive navigation and responsive design; strategic content architecture with clear information hierarchy; search engine optimization for improved visibility; user experience optimization for conversion; integrated analytics for performance tracking; security measures and regular maintenance protocols; social media integration and digital marketing alignment; accessibility compliance ensuring inclusive user access; and scalable infrastructure for future growth and feature expansion.`
    }
    
    return `Design a professional website for ${subject} that includes: compelling homepage with clear value proposition; detailed service/product pages with comprehensive information; about section showcasing expertise and credibility; contact information with multiple communication channels; user-friendly navigation and mobile responsiveness; professional design reflecting brand identity; and optimized performance for excellent user experience.`
  }
  
  // Writing-specific enhancement
  if (lowerPrompt.includes('write') || lowerPrompt.includes('article') || lowerPrompt.includes('blog') || lowerPrompt.includes('content')) {
    if (expansionLevel > 0) {
      return `${prompt} with advanced content strategy including: comprehensive research methodology using primary and secondary sources; detailed audience analysis and persona development; content structure optimization for readability and engagement; SEO integration with strategic keyword placement; multimedia elements including relevant images, charts, or infographics; expert interviews or quotes for authority and credibility; data-driven insights and supporting statistics; clear call-to-action elements; content distribution planning across multiple channels; and performance metrics definition for measuring success and engagement.`
    }
    
    return `${prompt} with structured approach including: engaging introduction that captures attention; well-researched main content with supporting evidence; clear organization with logical flow; appropriate tone for target audience; compelling conclusion with actionable insights; and professional formatting with proper citations where applicable.`
  }
  
  // Planning/Strategy enhancement
  if (lowerPrompt.includes('plan') || lowerPrompt.includes('strategy') || lowerPrompt.includes('organize')) {
    if (expansionLevel > 0) {
      return `${prompt} using comprehensive strategic planning methodology including: situational analysis with SWOT assessment; stakeholder mapping and engagement strategy; detailed timeline with critical path analysis; resource allocation with budget planning and risk assessment; performance indicators and success metrics definition; contingency planning for various scenarios; communication and change management protocols; quality assurance and review processes; implementation roadmap with phase-by-phase execution; and continuous improvement framework with regular evaluation and optimization cycles.`
    }
    
    return `${prompt} with systematic approach including: clear objective definition; comprehensive situation assessment; strategic planning with actionable steps; resource identification and allocation; timeline development with milestones; risk assessment and mitigation strategies; progress monitoring mechanisms; and adaptation protocols for changing circumstances.`
  }
  
  // Generic intelligent enhancement
  if (expansionLevel > 0) {
    return `${prompt}. Implement with advanced methodology including: comprehensive scope analysis and requirement gathering; strategic approach with best practices integration; detailed planning with phase-by-phase execution; quality assurance protocols with regular validation; stakeholder engagement and communication strategies; risk management with proactive mitigation; resource optimization for maximum efficiency; performance measurement with analytics and reporting; continuous improvement processes; and scalable framework for future enhancement and adaptation.`
  }
  
  return `${prompt}. Ensure comprehensive execution including: clear objective definition and scope; professional approach with attention to detail; organized structure with logical progression; quality standards and validation processes; appropriate resources and tools; timeline with realistic milestones; and success criteria for evaluation and optimization.${context ? ` Additional context: ${context}` : ''}`
} 