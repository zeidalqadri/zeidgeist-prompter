import { createDb, promptHistory, enhancementLogs, NewPromptHistory, NewEnhancementLog } from "../_shared/db"
import { enhancePrompt } from "../_shared/llm-enhancer"

// Handle CORS preflight requests
export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  const startTime = Date.now()
  
  // Debug: Check API key values
  console.log('🔍 API Key debugging:', {
    claudeLength: env.CLAUDE_API_KEY?.length || 0,
    openaiLength: env.OPENAI_API_KEY?.length || 0,
    claudeExists: !!env.CLAUDE_API_KEY,
    openaiExists: !!env.OPENAI_API_KEY,
    claudeType: typeof env.CLAUDE_API_KEY,
    openaiType: typeof env.OPENAI_API_KEY
  })
  
  // Add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }
  
  try {
    console.log('Function started, parsing JSON...')
    const body = await request.json()
    console.log('JSON parsed successfully')
    
    const { prompt, context, isRefinement, isExpansion, repeatCount } = body
    console.log('Request data extracted:', { hasPrompt: !!prompt })

    // Enhanced input validation
    if (!prompt || typeof prompt !== 'string') {
      console.log('Invalid prompt provided')
      return new Response(JSON.stringify({ 
        error: "Please provide a valid prompt to enhance." 
      }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    const trimmedPrompt = prompt.trim()
    if (!trimmedPrompt) {
      console.log('Empty prompt provided')
      return new Response(JSON.stringify({ 
        error: "Prompt cannot be empty. Please enter some text to enhance." 
      }), { 
        status: 400,
        headers: corsHeaders
      })
    }

    console.log('About to enhance prompt...')
    
    // Process the prompt using our LLM-based enhancer
    try {
      console.log('🔧 Calling enhancePrompt function...');
      console.log('🔍 Environment keys available:', Object.keys(env));
      const enhancementResponse = await enhancePrompt(
        trimmedPrompt, 
        context || "", 
        { isRefinement: !!isRefinement, isExpansion: !!isExpansion, repeatCount, env }
      )
      console.log('🎉 enhancePrompt returned:', enhancementResponse?.source);
      
      const processingTime = Date.now() - startTime
      console.log('Enhancement completed successfully')
      
      // Log enhancement to database for analytics
      try {
        const db = createDb(env)
        const enhancementLog: NewEnhancementLog = {
          original: trimmedPrompt,
          enhanced: enhancementResponse.enhancedPrompt,
          source: enhancementResponse.source,
          processingTime: processingTime.toString()
        }
        await db.insert(enhancementLogs).values(enhancementLog)
      } catch (logError) {
        console.error("Failed to log enhancement:", logError)
      }

      return new Response(JSON.stringify({ 
        result: enhancementResponse.enhancedPrompt,
        metadata: {
          source: enhancementResponse.source,
          processingTime,
          originalLength: trimmedPrompt.length,
          enhancedLength: enhancementResponse.enhancedPrompt.length,
          debugEnvKeys: Object.keys(env),
          debugHasKeys: {
            claude: !!env.CLAUDE_API_KEY,
            openai: !!env.OPENAI_API_KEY,
            deepseek: !!env.DEEPSEEK_API_KEY,
            mistral: !!env.MISTRAL_API_KEY,
            moonshot: !!env.MOONSHOT_API_KEY
          },
          debugKeyDetails: {
            claudeLength: env.CLAUDE_API_KEY?.length || 0,
            openaiLength: env.OPENAI_API_KEY?.length || 0,
            claudeType: typeof env.CLAUDE_API_KEY,
            openaiType: typeof env.OPENAI_API_KEY,
            claudeFirstChar: env.CLAUDE_API_KEY?.[0] || 'none',
            openaiFirstChar: env.OPENAI_API_KEY?.[0] || 'none'
          }
        }
      }), {
        headers: corsHeaders
      })
    } catch (enhancementError) {
      console.error("❌ Error enhancing prompt:", {
        message: enhancementError instanceof Error ? enhancementError.message : String(enhancementError),
        stack: enhancementError instanceof Error ? enhancementError.stack : undefined,
        name: enhancementError instanceof Error ? enhancementError.name : 'Unknown'
      })
      
      const processingTime = Date.now() - startTime
      
      // Provide simple fallback enhancement
      let fallbackEnhanced = trimmedPrompt
      if (!fallbackEnhanced.endsWith('.') && !fallbackEnhanced.endsWith('?') && !fallbackEnhanced.endsWith('!')) {
        fallbackEnhanced += '.'
      }
      if (context && context.trim()) {
        fallbackEnhanced = `Context: ${context}\n\nPrompt: ${fallbackEnhanced}`
      }

      return new Response(JSON.stringify({ 
        result: fallbackEnhanced,
        metadata: {
          source: 'fallback-error',
          processingTime,
          hadError: true,
          errorMessage: enhancementError instanceof Error ? enhancementError.message : String(enhancementError),
          errorName: enhancementError instanceof Error ? enhancementError.name : 'Unknown'
        }
      }), {
        headers: corsHeaders
      })
    }
  } catch (error) {
    console.error("Critical error processing request:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    const processingTime = Date.now() - startTime
    
    // Graceful error handling with user-friendly message
    return new Response(JSON.stringify({
      result: "I'm having trouble processing your request right now. Please try rephrasing your prompt or try again in a moment.",
      metadata: {
        source: 'error-handler',
        processingTime,
        hadCriticalError: true,
        errorMessage: error instanceof Error ? error.message : String(error)
      }
    }), {
      status: 200, // Use 200 to avoid showing error UI
      headers: corsHeaders
    })
  }
}