import { createDb, promptHistory, enhancementLogs, NewPromptHistory, NewEnhancementLog } from "../_shared/db"
import { getOptimizedDb, executeWithRetry } from "../_shared/db-pool"
import { enhancePrompt } from "../_shared/llm-enhancer"
import { validateRequest, createAuthErrorResponse } from "../_shared/auth"

function getCorsHeaders(request: Request, env: any) {
  const origin = request.headers.get('Origin') || '*'
  const nodeEnv = (env?.NODE_ENV || 'development')
  const isDev = nodeEnv !== 'production'
  const allowOrigin = isDev ? origin : 'https://mstprmpt.zeidgeist.com'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, Authorization, X-Test-Provider',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
}
import { getProviderPreferences } from "./tweak/provider-preference"

// Handle CORS preflight requests
export async function onRequestOptions(context: any): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(context.request, context.env),
  })
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context
  const startTime = Date.now()
  
  // Removed debug logging for security
  
  // Add CORS headers with performance optimizations
  const corsHeaders = {
    ...getCorsHeaders(request, env),
    'Content-Type': 'application/json',
    'Content-Encoding': 'gzip', // Enable compression
    'Cache-Control': 'no-cache, no-store, must-revalidate', // Prevent caching of sensitive data
    'X-Content-Type-Options': 'nosniff',
    'X-Response-Time': `${Date.now() - startTime}ms` // Add response time header
  }

  // Validate authentication and rate limiting
  const authResult = validateRequest(request, env, '/api/engineer');
  if (!authResult.success) {
    return createAuthErrorResponse(authResult.error!, corsHeaders);
  }
  
  try {
    console.log('Function started, parsing JSON...')
    const body = await request.json() as any
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
    
    // Check for provider preferences from /tweak page
    const providerPreferences = getProviderPreferences(request)
    console.log('🎯 Provider preferences:', providerPreferences?.selectionMode || 'random')
    
    // Check for test provider header (from /tweak page testing)
    const testProvider = request.headers.get('X-Test-Provider')
    
    // Process the prompt using our LLM-based enhancer
    try {
      console.log('🔧 Calling enhancePrompt function...');
      const enhancementResponse = await enhancePrompt(
        trimmedPrompt, 
        context || "", 
        { 
          isRefinement: !!isRefinement, 
          isExpansion: !!isExpansion, 
          repeatCount, 
          env,
          providerPreferences,
          testProvider 
        }
      )
      console.log('🎉 enhancePrompt returned:', enhancementResponse?.source);
      
      const processingTime = Date.now() - startTime
      console.log('Enhancement completed successfully')
      
      // Log enhancement to database for analytics with optimized connection pool
      try {
        const db = getOptimizedDb(env)
        const enhancementLog: NewEnhancementLog = {
          promptLength: trimmedPrompt.length,
          hasContext: !!(context && context.trim()),
          isRefinement: !!isRefinement,
          isExpansion: !!isExpansion,
          repeatCount: repeatCount || 0,
          source: enhancementResponse.source,
          processingTime: processingTime,
          wasIdentical: trimmedPrompt === enhancementResponse.enhancedPrompt,
          hadError: false
        }
        
        // Execute database insert with retry logic
        await executeWithRetry(async () => {
          return db.insert(enhancementLogs).values(enhancementLog)
        })
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
          // Debug information removed for security
        }
      }), {
        headers: corsHeaders
      })
    } catch (enhancementError) {
      console.error("❌ Error enhancing prompt:", {
        message: enhancementError instanceof Error ? enhancementError.message : String(enhancementError),
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
          hadError: true
        }
      }), {
        headers: corsHeaders
      })
    }
  } catch (error) {
    console.error("Critical error processing request:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : 'Unknown'
    })
    
    const processingTime = Date.now() - startTime
    
    // Graceful error handling with user-friendly message
    return new Response(JSON.stringify({
      result: "I'm having trouble processing your request right now. Please try rephrasing your prompt or try again in a moment.",
      metadata: {
        source: 'error-handler',
        processingTime,
        hadCriticalError: true
      }
    }), {
      status: 200, // Use 200 to avoid showing error UI
      headers: corsHeaders
    })
  }
}
