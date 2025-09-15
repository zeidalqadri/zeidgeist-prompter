// Provider Status Endpoint for /tweak page
// Returns provider availability without sensitive debug information

import { getProviderPreferences } from "./provider-preference";

interface Env {
  CLAUDE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
  GEMINI_API_KEY?: string;
  DEBUG_ACCESS_TOKEN?: string;
}

interface ProviderStatus {
  provider: string;
  configured: boolean;
  enabled: boolean;
  notes?: string;
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const { env, request } = context;
  
  // Simple authentication check using the same token as debug endpoint
  const authHeader = request.headers.get('Authorization');
  const debugToken = env.DEBUG_ACCESS_TOKEN || 'debug-token-not-set';
  
  if (authHeader !== `Bearer ${debugToken}` && debugToken !== 'debug-token-not-set') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - valid access token required' }), 
      { 
        status: 401,
        headers: { 
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      }
    );
  }

  // Read current preferences (used to reflect enabled/disabled state)
  const prefs = getProviderPreferences(request);
  const excluded = new Set((prefs?.excludedProviders || []).map(p => p.toLowerCase()));

  // Helper to compute enabled state based on cookie exclusions and key presence
  const isEnabled = (name: string, configured: boolean) => configured && !excluded.has(name.toLowerCase());

  // Check provider configurations (without exposing key details)
  const providerStatuses: ProviderStatus[] = [
    {
      provider: 'Claude',
      configured: !!env.CLAUDE_API_KEY,
      enabled: isEnabled('Claude', !!env.CLAUDE_API_KEY),
      notes: 'Primary provider (Anthropic)'
    },
    {
      provider: 'OpenAI',
      configured: !!env.OPENAI_API_KEY,
      enabled: isEnabled('OpenAI', !!env.OPENAI_API_KEY),
      notes: 'OpenAI compatible (gpt-4o-mini)'
    },
    {
      provider: 'Mistral',
      configured: !!env.MISTRAL_API_KEY,
      enabled: isEnabled('Mistral', !!env.MISTRAL_API_KEY),
      notes: 'Mistral (large/latest)'
    },
    {
      provider: 'DeepSeek',
      configured: !!env.DEEPSEEK_API_KEY,
      enabled: isEnabled('DeepSeek', !!env.DEEPSEEK_API_KEY),
      notes: 'DeepSeek chat model'
    },
    {
      provider: 'Moonshot',
      configured: !!env.MOONSHOT_API_KEY,
      enabled: isEnabled('Moonshot', !!env.MOONSHOT_API_KEY),
      notes: 'Moonshot (kimi)'
    },
    {
      provider: 'Gemini',
      configured: !!env.GEMINI_API_KEY,
      enabled: isEnabled('Gemini', !!env.GEMINI_API_KEY),
      notes: 'Google Gemini 1.5 Pro'
    }
  ];

  // Calculate summary statistics
  const availableProviders = providerStatuses.filter(status => status.configured && status.enabled);
  const totalConfigured = providerStatuses.filter(status => status.configured).length;

  const result = {
    timestamp: new Date().toISOString(),
    summary: {
      totalProviders: providerStatuses.length,
      configuredKeys: totalConfigured,
      availableForUse: availableProviders.length,
      randomSelectionWorking: availableProviders.length > 1
    },
    providers: providerStatuses,
    status: 'success'
  };

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      ...corsHeaders
    }
  });
}
