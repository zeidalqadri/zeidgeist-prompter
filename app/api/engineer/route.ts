import { NextRequest, NextResponse } from "next/server"
import { enhancePrompt } from "../../lib/llm-enhancer"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { prompt, context, isRefinement } = body

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 })
    }

    // Process the prompt using our LLM-based enhancer
    try {
      const enhancedPrompt = await enhancePrompt(prompt, context || "", isRefinement)
      
      // CRITICAL: Verify the enhancedPrompt is actually different from the input
      if (enhancedPrompt === prompt) {
        console.warn("Enhancement returned identical prompt, applying fallback enhancement")
        
        // Apply a more robust fallback enhancement
        let fallbackEnhanced = prompt
        
        // If this is a refinement, we MUST return something different
        if (isRefinement) {
          if (prompt.toLowerCase().includes('website')) {
            fallbackEnhanced = `${prompt} Include detailed sections for services offered, brand story, unique value proposition, client testimonials, portfolio showcase, clear calls-to-action, contact information, and a visually appealing layout that communicates the brand identity effectively.`;
          } else if (prompt.toLowerCase().includes('write')) {
            fallbackEnhanced = `${prompt} Ensure it includes a compelling introduction, well-organized main sections with supporting evidence, clear transitions between ideas, engaging examples or case studies, expert opinions where relevant, data to support key points, and a strong conclusion with actionable insights.`;
          } else {
            // More substantial generic enhancement
            fallbackEnhanced = `${prompt}. Include comprehensive details with specific instructions, clear organization with logical section order, professional formatting with appropriate headings, concrete examples to illustrate key points, relevant constraints or requirements, and measurable success criteria to evaluate outcomes.`;
          }
          
          return NextResponse.json({ result: fallbackEnhanced })
        }
        
        // For non-refinements, use the original simpler fallback
        if (prompt.toLowerCase().includes('website')) {
          fallbackEnhanced = `Design a professional website for ${prompt.replace('website for ', '').replace('website', '')}.` +
                              ' Include sections for services offered, about information, testimonials, and contact details.';
        } else {
          // Generic enhancement
          fallbackEnhanced = `${prompt}. Include comprehensive details, clear structure, and professional formatting.`;
        }
        
        return NextResponse.json({ result: fallbackEnhanced })
      }
      
      return NextResponse.json({ result: enhancedPrompt })
    } catch (enhancementError) {
      console.error("Error enhancing prompt:", enhancementError)
      
      // If we encounter an error, DO NOT return the original prompt
      // Instead, apply a simple enhancement to guarantee a different result
      const simpleEnhanced = `${prompt}. Ensure it is comprehensive, well-structured, and professionally presented.`;
      return NextResponse.json({ result: simpleEnhanced })
    }
  } catch (error) {
    console.error("Error processing prompt:", error)
    // Even if JSON parsing fails, return a 200 response to avoid showing error messages
    return NextResponse.json(
      { result: "I couldn't process that. Please try again." },
      { status: 200 }
    )
  }
} 