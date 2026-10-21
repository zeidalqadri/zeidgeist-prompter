// API Keys Diagnostic Endpoint
// This endpoint helps diagnose which API keys are available in the deployment environment
// SECURITY: Only available in non-production environments with valid DEBUG_ACCESS_TOKEN

interface Env {
  CLAUDE_API_KEY?: string;
  OPENAI_API_KEY?: string;
  MISTRAL_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
  GEMINI_API_KEY?: string;
  NODE_ENV?: string;
  APP_ENV?: string;
  DEBUG_ACCESS_TOKEN?: string;
}

interface ApiKeyStatus {
  provider: string;
  configured: boolean;
  // NOTE: keyPreview removed for security - only show boolean configuration status
  enabled: boolean;
  notes?: string;
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const { env, request } = context;

  // Security check - only allow in development/staging environments
  const appEnv = env.APP_ENV || env.NODE_ENV || 'production';
  const allowedEnvs = ['development', 'staging', 'preview'];

  // Answer 404 and name nothing: in production this route should not confirm it exists
  // or say which environment it runs in.
  if (!allowedEnvs.includes(appEnv)) {
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // SECURITY: Always require DEBUG_ACCESS_TOKEN - no bypass allowed
  const authHeader = request.headers.get('Authorization');
  const debugToken = env.DEBUG_ACCESS_TOKEN;

  if (!debugToken) {
    return new Response(
      JSON.stringify({ error: 'DEBUG_ACCESS_TOKEN not configured - endpoint disabled' }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  if (!authHeader || !safeEqual(authHeader, `Bearer ${debugToken}`)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - valid debug token required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // SECURITY: Only show if keys are configured, NOT their values or previews
  const isConfigured = (key?: string): boolean => !!key && key.length > 0;

  // Check all API key configurations (no key values exposed)
  const apiKeyStatuses: ApiKeyStatus[] = [
    {
      provider: 'Claude',
      configured: isConfigured(env.CLAUDE_API_KEY),
      enabled: true,
      notes: 'Primary AI provider - claude-3-haiku-20240307 (Anthropic)'
    },
    {
      provider: 'OpenAI',
      configured: isConfigured(env.OPENAI_API_KEY),
      enabled: true,
      notes: 'Secondary AI provider - gpt-4o-mini'
    },
    {
      provider: 'Mistral',
      configured: isConfigured(env.MISTRAL_API_KEY),
      enabled: true,
      notes: 'Tertiary AI provider - mistral-large-latest'
    },
    {
      provider: 'DeepSeek',
      configured: isConfigured(env.DEEPSEEK_API_KEY),
      enabled: false,
      notes: 'DISABLED - Issues with intro/outro text formatting'
    },
    {
      provider: 'Moonshot',
      configured: isConfigured(env.MOONSHOT_API_KEY),
      enabled: true,
      notes: 'Alternative AI provider - moonshot-v1-8k (Kimi)'
    },
    {
      provider: 'Gemini',
      configured: isConfigured(env.GEMINI_API_KEY),
      enabled: false,
      notes: 'Not implemented in Cloudflare Functions version'
    }
  ];

  // Calculate available providers
  const availableProviders = apiKeyStatuses.filter(status => status.configured && status.enabled);
  const totalConfigured = apiKeyStatuses.filter(status => status.configured).length;
  const totalEnabled = apiKeyStatuses.filter(status => status.enabled).length;

  // Determine random selection status
  const randomSelectionWorking = availableProviders.length > 1;
  let randomSelectionIssue = '';
  
  if (availableProviders.length === 0) {
    randomSelectionIssue = 'No AI providers available - all requests will fail';
  } else if (availableProviders.length === 1) {
    randomSelectionIssue = `Only ${availableProviders[0].provider} available - no random selection`;
  }

  const diagnosticResult = {
    timestamp: new Date().toISOString(),
    environment: appEnv,
    summary: {
      totalProviders: apiKeyStatuses.length,
      configuredKeys: totalConfigured,
      enabledProviders: totalEnabled,
      availableForUse: availableProviders.length,
      randomSelectionWorking,
      primaryIssue: randomSelectionIssue || 'All systems functioning correctly'
    },
    providers: apiKeyStatuses,
    availableProviders: availableProviders.map(p => p.provider),
    recommendations: generateRecommendations(apiKeyStatuses, availableProviders),
    nextSteps: [
      'Add missing API keys to Cloudflare Pages environment variables',
      'Verify API keys are valid and have sufficient quota',
      'Test random selection by making multiple enhancement requests',
      'Remove this diagnostic endpoint after fixing the issue'
    ],
    security: {
      note: 'This endpoint reports whether each key is configured. It returns no key values or previews.',
      recommendation: 'Remove this endpoint from production after debugging'
    }
  };

  return new Response(JSON.stringify(diagnosticResult, null, 2), {
    status: 200,
    headers: { 
      'Content-Type': 'application/json',
      'X-Debug-Timestamp': new Date().toISOString()
    }
  });
}

// Compare without returning early at the first differing byte, so response time
// does not reveal how much of a guessed token was right.
function safeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let i = 0; i < length; i++) {
    difference |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return difference === 0;
}

function generateRecommendations(
  statuses: ApiKeyStatus[], 
  available: ApiKeyStatus[]
): string[] {
  const recommendations: string[] = [];
  
  if (available.length === 0) {
    recommendations.push('CRITICAL: Add at least one AI provider API key immediately');
  } else if (available.length === 1) {
    recommendations.push('Add additional AI provider API keys for load balancing and redundancy');
  }
  
  // Check specific missing providers
  const missingProviders = statuses.filter(s => s.enabled && !s.configured);
  if (missingProviders.length > 0) {
    recommendations.push(`Missing API keys for: ${missingProviders.map(p => p.provider).join(', ')}`);
  }
  
  // Check if only OpenAI is available
  if (available.length === 1 && available[0].provider === 'OpenAI') {
    recommendations.push('Only OpenAI available - this explains why all requests use OpenAI');
    recommendations.push('Add CLAUDE_API_KEY and MISTRAL_API_KEY for random provider selection');
  }
  
  if (statuses.find(s => s.provider === 'Gemini' && s.configured)) {
    recommendations.push('Gemini API key detected but not implemented - consider adding Gemini support');
  }
  
  return recommendations;
}