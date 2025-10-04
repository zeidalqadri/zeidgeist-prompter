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

    // PHASE 1: Smart Enhancement Router - Try learned patterns first
    let enhancementResponse
    let usedLearning = false
    let abTestMode = false

    try {
      // PHASE 5: A/B Testing - Randomly test 10% of requests
      const { getQualityValidator } = await import('../../app/lib/learning/quality-validator')
      const qualityValidator = getQualityValidator()
      abTestMode = !testProvider && qualityValidator.shouldRunABTest()

      // Skip learning for test provider requests (from /tweak page)
      if (!testProvider) {
        console.log('🧠 Checking learned patterns first...');
        const { AdaptiveEnhancer } = await import('../../app/lib/learning/adaptive-enhancer')
        const adaptiveEnhancer = new AdaptiveEnhancer()
        const localAttempt = await adaptiveEnhancer.enhance(trimmedPrompt)

        console.log(`📊 Local pattern confidence: ${localAttempt.confidence.toFixed(2)} (source: ${localAttempt.source})`);

        // A/B Test Mode: Run both local and LLM, compare quality
        if (abTestMode && localAttempt.confidence >= 0.5 && localAttempt.source === 'learned') {
          console.log('🧪 A/B Test Mode: Running both local and LLM for comparison');

          // Run LLM enhancement
          const llmResponse = await enhancePrompt(
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

          // Compare quality (async, non-blocking)
          context.waitUntil(
            qualityValidator.compareEnhancements(
              trimmedPrompt,
              localAttempt.enhanced,
              localAttempt.confidence,
              llmResponse.enhancedPrompt
            ).catch(err => console.error('A/B test comparison failed:', err))
          )

          // For A/B tests, use LLM result but log that we tested
          enhancementResponse = {
            ...llmResponse,
            metadata: {
              ...llmResponse.metadata,
              abTested: true,
              localConfidence: localAttempt.confidence
            }
          }
          console.log('🧪 A/B test complete - using LLM result');
        }
        // High confidence: Use learned patterns (target: 60-70% of cases eventually)
        else if (localAttempt.confidence >= 0.7 && localAttempt.source === 'learned') {
          console.log('✅ Using learned patterns (high confidence)');
          enhancementResponse = {
            enhancedPrompt: localAttempt.enhanced,
            source: 'local',
            metadata: {
              confidence: localAttempt.confidence,
              patterns: localAttempt.patterns,
              learningSource: 'learned'
            }
          }
          usedLearning = true
        }
        // Medium confidence: Hybrid approach (patterns + LLM refinement)
        else if (localAttempt.confidence >= 0.4 && localAttempt.source === 'learned') {
          console.log('🔄 Using hybrid enhancement (medium confidence)');
          // Use local enhancement as a starting point, then refine with LLM
          const llmResponse = await enhancePrompt(
            localAttempt.enhanced, // Start with local enhancement
            context || "",
            {
              isRefinement: true, // Mark as refinement since we're building on local
              isExpansion: !!isExpansion,
              repeatCount,
              env,
              providerPreferences,
              testProvider
            }
          )
          enhancementResponse = {
            ...llmResponse,
            source: 'hybrid' as any,
            metadata: {
              ...llmResponse.metadata,
              localConfidence: localAttempt.confidence,
              localPatterns: localAttempt.patterns,
              hybridApproach: true
            }
          }
          usedLearning = true
          console.log('✅ Hybrid enhancement complete');
        }
      }

      // Low confidence or test mode: Full LLM enhancement
      if (!enhancementResponse) {
        console.log('🔧 Using full LLM enhancement (low confidence or test mode)...');
        enhancementResponse = await enhancePrompt(
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
      }

      console.log('🎉 Enhancement returned:', enhancementResponse?.source);
      
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

        // PHASE 7: Real-time Learning - Store successful LLM enhancements for future learning
        if (!usedLearning &&
            (enhancementResponse.source === 'claude' ||
             enhancementResponse.source === 'openai' ||
             enhancementResponse.source === 'deepseek' ||
             enhancementResponse.source === 'mistral' ||
             enhancementResponse.source === 'moonshot' ||
             enhancementResponse.source === 'gemini')) {
          // Queue learning task asynchronously (non-blocking)
          try {
            console.log('📚 Queuing enhancement for learning...');
            const { LearningService } = await import('../../app/lib/learning/learning-service')
            const learningService = new LearningService()

            // Store enhancement for future pattern extraction (async, non-blocking)
            // This will be picked up by the learning cycle or used immediately
            const enhancementLogEntry = {
              originalPrompt: trimmedPrompt,
              enhancedPrompt: enhancementResponse.enhancedPrompt,
              context: context || '',
              source: enhancementResponse.source,
              processingTime
            }

            // Try to extract and store patterns immediately (best effort)
            context.waitUntil(
              learningService.storeSuccessfulEnhancement(
                trimmedPrompt,
                enhancementResponse.enhancedPrompt,
                enhancementResponse.source,
                { processingTime, ...enhancementResponse.metadata }
              ).catch(err => {
                console.error('Failed to store for learning (non-critical):', err)
              })
            )
            console.log('✅ Enhancement queued for learning');
          } catch (learningError) {
            // Non-critical error - don't fail the request
            console.error('Failed to queue for learning (non-critical):', learningError)
          }
        } else if (usedLearning) {
          console.log('ℹ️ Skipping learning storage - used learned patterns');
        }
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
