// Provider Preference API Endpoint
// Manages LLM provider selection preferences via secure cookies

interface ProviderPreferences {
  selectionMode: 'random' | 'forced' | 'custom'
  forcedProvider?: string
  excludedProviders: string[]
  sessionDuration: number
  timestamp: number
}

interface Env {
  NODE_ENV?: string
  DEBUG_ACCESS_TOKEN?: string
  CORS_ORIGINS?: string
}

function getCorsHeaders(request: Request, env: Env) {
  const origin = request.headers.get('Origin') || '*'
  const isDev = (env.NODE_ENV || 'development') !== 'production'
  const allowed = env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['https://mstprmpt.zeidgeist.com']
  const allowOrigin = isDev ? origin : (allowed.includes(origin) ? origin : 'https://mstprmpt.zeidgeist.com')
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Vary': 'Origin'
  }
}

// Handle CORS preflight requests
export async function onRequestOptions(context: { env: Env; request: Request }): Promise<Response> {
  const headers = getCorsHeaders(context.request, context.env)
  return new Response(null, { status: 200, headers })
}

// GET: Retrieve current provider preferences
export async function onRequestGet(context: { env: Env; request: Request }): Promise<Response> {
  const corsBase = getCorsHeaders(context.request, context.env)
  const corsHeaders = { ...corsBase, 'Content-Type': 'application/json' }

  try {
    // Parse cookies from request
    const cookieHeader = context.request.headers.get('Cookie') || ''
    const preferences = parsePrefCookie(cookieHeader)

    return new Response(JSON.stringify({
      success: true,
      preferences: preferences || {
        selectionMode: 'random',
        forcedProvider: undefined,
        excludedProviders: [],
        sessionDuration: 24,
        timestamp: Date.now()
      }
    }), {
      status: 200,
      headers: corsHeaders
    })
  } catch (error) {
    console.error('Error retrieving preferences:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to retrieve preferences'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// POST: Save provider preferences
export async function onRequestPost(context: { env: Env; request: Request }): Promise<Response> {
  const corsBase = getCorsHeaders(context.request, context.env)
  const corsHeaders = { ...corsBase, 'Content-Type': 'application/json' }

  try {
    const body = await context.request.json()
    const { preferences } = body

    if (!preferences || typeof preferences !== 'object') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid preferences data'
      }), {
        status: 400,
        headers: corsHeaders
      })
    }

    // Validate preferences structure
    const validatedPrefs: ProviderPreferences = {
      selectionMode: preferences.selectionMode || 'random',
      forcedProvider: preferences.forcedProvider || undefined,
      excludedProviders: Array.isArray(preferences.excludedProviders) ? preferences.excludedProviders : [],
      sessionDuration: typeof preferences.sessionDuration === 'number' ? preferences.sessionDuration : 24,
      timestamp: Date.now()
    }

    // Create secure cookie
    const cookieValue = createPrefCookie(validatedPrefs)
    const maxAge = validatedPrefs.sessionDuration * 60 * 60 // Convert hours to seconds

    const responseHeaders = {
      ...corsHeaders,
      'Set-Cookie': `llm-provider-prefs=${cookieValue}; Max-Age=${maxAge}; HttpOnly; SameSite=Strict; Secure`
    }

    return new Response(JSON.stringify({
      success: true,
      preferences: validatedPrefs,
      message: 'Preferences saved successfully'
    }), {
      status: 200,
      headers: responseHeaders
    })
  } catch (error) {
    console.error('Error saving preferences:', error)
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to save preferences'
    }), {
      status: 500,
      headers: corsHeaders
    })
  }
}

// Helper function to create preference cookie value
function createPrefCookie(preferences: ProviderPreferences): string {
  try {
    const jsonString = JSON.stringify(preferences)
    // Simple base64 encoding for cookie storage
    return btoa(jsonString)
  } catch (error) {
    console.error('Error creating preference cookie:', error)
    throw new Error('Failed to encode preferences')
  }
}

// Helper function to parse preference cookie
function parsePrefCookie(cookieHeader: string): ProviderPreferences | null {
  try {
    // Extract the llm-provider-prefs cookie
    const match = cookieHeader.match(/llm-provider-prefs=([^;]+)/)
    if (!match) {
      return null
    }

    const cookieValue = match[1]
    const jsonString = atob(cookieValue)
    const preferences = JSON.parse(jsonString) as ProviderPreferences

    // Check if preferences are expired
    const hoursElapsed = (Date.now() - preferences.timestamp) / (1000 * 60 * 60)
    if (hoursElapsed > preferences.sessionDuration) {
      return null // Expired
    }

    return preferences
  } catch (error) {
    console.error('Error parsing preference cookie:', error)
    return null
  }
}

// Helper function to get preferences for use in other API endpoints
export function getProviderPreferences(request: Request): ProviderPreferences | null {
  const cookieHeader = request.headers.get('Cookie') || ''
  return parsePrefCookie(cookieHeader)
}
