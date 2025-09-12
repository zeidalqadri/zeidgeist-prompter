// API Keys Diagnostic Endpoint
// This endpoint helps diagnose which API keys are available in the deployment environment
// IMPORTANT: This should only be used for debugging and removed after fixing the issue

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
  keyPreview?: string; // First 8 and last 4 characters for verification
  enabled: boolean;
  notes?: string;
}

export async function onRequestGet(context: { env: Env; request: Request }) {
  const { env, request } = context;
  
  // Security check - only allow in development/staging environments
  const appEnv = env.APP_ENV || env.NODE_ENV || 'production';
  const allowedEnvs = ['development', 'staging', 'preview'];
  
  if (!allowedEnvs.includes(appEnv)) {
    return new Response(
      JSON.stringify({ 
        error: 'This diagnostic endpoint is only available in development/staging environments',
        environment: appEnv
      }), 
      { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Check for admin access token (optional security measure)
  const authHeader = request.headers.get('Authorization');
  const debugToken = env.DEBUG_ACCESS_TOKEN || 'debug-token-not-set';
  
  if (authHeader !== `Bearer ${debugToken}` && debugToken !== 'debug-token-not-set') {
    return new Response(
      JSON.stringify({ error: 'Unauthorized - valid debug token required' }), 
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  // Function to create safe key preview
  const createKeyPreview = (key?: string): string | undefined => {
    if (!key || key.length < 12) return undefined;
    return `${key.slice(0, 8)}...${key.slice(-4)}`;
  };

  // Check all API key configurations
  const apiKeyStatuses: ApiKeyStatus[] = [
    {
      provider: 'Claude (Anthropic)',
      configured: !!env.CLAUDE_API_KEY,
      keyPreview: createKeyPreview(env.CLAUDE_API_KEY),
      enabled: true,
      notes: 'Primary AI provider - claude-3-haiku-20240307'
    },
    {
      provider: 'OpenAI',
      configured: !!env.OPENAI_API_KEY,
      keyPreview: createKeyPreview(env.OPENAI_API_KEY),
      enabled: true,
      notes: 'Secondary AI provider - gpt-4o-mini'
    },
    {
      provider: 'Mistral',
      configured: !!env.MISTRAL_API_KEY,
      keyPreview: createKeyPreview(env.MISTRAL_API_KEY),
      enabled: true,
      notes: 'Tertiary AI provider - mistral-large-latest'
    },
    {
      provider: 'DeepSeek',
      configured: !!env.DEEPSEEK_API_KEY,
      keyPreview: createKeyPreview(env.DEEPSEEK_API_KEY),
      enabled: false,
      notes: 'DISABLED - Issues with intro/outro text formatting'
    },
    {
      provider: 'Moonshot (Kimi)',
      configured: !!env.MOONSHOT_API_KEY,
      keyPreview: createKeyPreview(env.MOONSHOT_API_KEY),
      enabled: true,
      notes: 'Alternative AI provider - moonshot-v1-8k'
    },
    {
      provider: 'Gemini',
      configured: !!env.GEMINI_API_KEY,
      keyPreview: createKeyPreview(env.GEMINI_API_KEY),
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
      warning: 'This diagnostic endpoint exposes partial API key information',
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