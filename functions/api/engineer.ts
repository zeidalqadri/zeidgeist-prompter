import { createDb, promptHistory, enhancementLogs, NewPromptHistory, NewEnhancementLog } from "../_shared/db"
import { getOptimizedDb, executeWithRetry } from "../_shared/db-pool"
import { enhancePrompt } from "../_shared/llm-enhancer-refactored"
import { validateRequest, createAuthErrorResponse } from "../_shared/auth"
import { LLMCacheManager } from "../_shared/cache-manager"

// Define proper Cloudflare context types
interface CloudflareContext {
  request: Request
  env: any
  waitUntil?: (promise: Promise<any>) => void
}

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
export async function onRequestOptions(context: CloudflareContext): Promise<Response> {
  return new Response(null, {
    status: 200,
    headers: getCorsHeaders(context.request, context.env),
  })
}

export async function onRequestPost(context: CloudflareContext): Promise<Response> {
  const { request, env } = context
  const startTime = Date.now()

  // Initialize cache manager
  let cacheManager: LLMCacheManager | null = null
  if (env.CACHE_STORAGE) {
    cacheManager = new LLMCacheManager(env.CACHE_STORAGE)
  }

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

    // PHASE 0: Check cache for identical prompts (if cache is available)
    if (cacheManager && !testProvider) {
      const cachedResponse = await cacheManager.getCachedResponse(trimmedPrompt, {
        temperature: 0.7
      })

      if (cachedResponse) {
        const cacheTime = Date.now() - startTime
        console.log(`🚀 Cache HIT! Returning cached response (${cacheTime}ms)`)

        return new Response(JSON.stringify({
          result: cachedResponse,
          metadata: {
            source: 'cache',
            processingTime: cacheTime,
            originalLength: trimmedPrompt.length,
            enhancedLength: cachedResponse.length,
            cached: true
          }
        }), {
          headers: {
            ...corsHeaders,
            'X-Cache': 'HIT',
            'X-Response-Time': `${cacheTime}ms`
          }
        })
      }
      console.log('🔍 Cache MISS - proceeding with enhancement')
    }

    // PHASE 1: Smart Enhancement Router - Try learned patterns first
    let enhancementResponse
    let usedLearning = false
    let abTestMode = false

    try {
      // PHASE 5: A/B Testing - Now re-enabled with Worker-compatible modules
      // Skip learning for test provider requests (from /tweak page)
      if (!testProvider) {
        console.log('🧠 Checking learned patterns first...');
        const { createAdaptiveEnhancer } = await import('../_shared/learning')
        const adaptiveEnhancer = createAdaptiveEnhancer()
        const localAttempt = await adaptiveEnhancer.enhance(env, trimmedPrompt, context || undefined)

        console.log(`📊 Local pattern confidence: ${localAttempt.confidence.toFixed(2)} (source: ${localAttempt.source})`);

        // DISABLED: High confidence local patterns - always use LLM for deployment
        // The local enhancement system needs more training data before it can be trusted
        if (false && localAttempt.confidence >= 0.95 && localAttempt.source === 'learned-patterns') {
          console.log('✅ Using learned patterns (high confidence)');
          enhancementResponse = {
            enhancedPrompt: localAttempt.enhancedPrompt,
            source: 'local',
            metadata: {
              confidence: localAttempt.confidence,
              patterns: localAttempt.patternsUsed,
              learningSource: 'learned'
            }
          }
          usedLearning = true
        }
        // DISABLED: Medium confidence hybrid approach - always use full LLM
        else if (false && localAttempt.confidence >= 0.4 && localAttempt.source === 'learned-patterns') {
          console.log('🔄 Using hybrid enhancement (medium confidence)');
          // Use local enhancement as a starting point, then refine with LLM
          const llmResponse = await enhancePrompt(
            localAttempt.enhancedPrompt, // Start with local enhancement
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
              localPatterns: localAttempt.patternsUsed,
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

      // Cache successful LLM responses (in background)
      if (cacheManager && !testProvider && !usedLearning && enhancementResponse.enhancedPrompt) {
        const metadata = enhancementResponse.metadata as any
        const confidenceScore = metadata?.confidence || metadata?.localConfidence || 0.7
        // Only use waitUntil if it's available (Cloudflare Workers environment)
        if (context.waitUntil) {
          context.waitUntil(
            cacheManager.cacheResponse(
              trimmedPrompt,
              enhancementResponse.enhancedPrompt,
              {
                provider: enhancementResponse.source,
                temperature: 0.7,
                confidenceScore
              }
            ).catch(err => console.error('Failed to cache response:', err))
          )
        } else {
          // Fall back to direct execution without background processing
          cacheManager.cacheResponse(
            trimmedPrompt,
            enhancementResponse.enhancedPrompt,
            {
              provider: enhancementResponse.source,
              temperature: 0.7,
              confidenceScore
            }
          ).catch(err => console.error('Failed to cache response:', err))
        }
      }
      
      // Log enhancement to database for analytics with optimized connection pool
      try {
        const db = getOptimizedDb(env)
        if (!db) {
          console.log('Database not available - skipping logging')
        } else {
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
              (enhancementResponse.source === 'deepseek' ||
               enhancementResponse.source === 'mistral' ||
               enhancementResponse.source === 'gemini')) {
            // Store successful enhancement for learning
            console.log('📚 Storing enhancement for learning...');
            const { createLearningService } = await import('../_shared/learning')
            const learningService = createLearningService()

            // Store in background (don't block response)
            if (context.waitUntil) {
              context.waitUntil(
                learningService.storeSuccessfulEnhancement(
                  env,
                  trimmedPrompt,
                  enhancementResponse.enhancedPrompt,
                  enhancementResponse.source,
                  { context: context || '', processingTime }
                ).catch(err => console.error('Failed to store enhancement for learning:', err))
              )
            } else {
              // Fall back to direct execution without background processing
              learningService.storeSuccessfulEnhancement(
                env,
                trimmedPrompt,
                enhancementResponse.enhancedPrompt,
                enhancementResponse.source,
                { context: context || '', processingTime }
              ).catch(err => console.error('Failed to store enhancement for learning:', err))
            }
          } else if (usedLearning) {
            console.log('ℹ️ Skipping learning storage - used learned patterns');
          }
        } // Close the else block for database logging
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
          source: 'local',
          processingTime,
          fallbackMode: 'error-recovery',
          originalError: enhancementError instanceof Error ? enhancementError.message : String(enhancementError)
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
