# AI Provider Random Selection Troubleshooting Guide

## Issue Description
The deployed app at `mstprmpt.zeidgeist.com` was only using OpenAI for prompt enhancement instead of randomly selecting between different AI providers (Claude, OpenAI, Mistral, Moonshot) as designed.

## Root Cause Analysis

### 1. Code Architecture ✅ WORKING
The random selection logic is correctly implemented in `functions/_shared/llm-enhancer.ts`:

- **Random Selection**: Uses `shuffleArray()` function to randomize provider order (lines 696-703)
- **Provider Rotation**: Tries providers in random order until one succeeds (lines 769-784)
- **Fallback Logic**: Falls back to local enhancement if all providers fail (line 787)

### 2. Environment Variable Configuration ❌ ISSUE FOUND
The random selection **only works when multiple API keys are configured**. If only one API key is present, only that provider will be used.

**Expected Providers:**
- ✅ Claude (Anthropic) - `claude-3-haiku-20240307`
- ✅ OpenAI - `gpt-4o-mini`
- ✅ Mistral - `mistral-large-latest`
- ❌ DeepSeek - **Intentionally disabled** (formatting issues)
- ✅ Moonshot (Kimi) - `moonshot-v1-8k`

**Problem**: Missing API keys in Cloudflare Pages environment variables.

## Solution Steps

### 1. Diagnose Current State
Use the diagnostic endpoint to check which API keys are available:

```bash
# For staging/preview environments
curl -H "Authorization: Bearer your-debug-token" \
  https://mstprmpt.zeidgeist.com/api/debug/api-keys
```

### 2. Add Missing API Keys to Cloudflare Pages

1. **Log into Cloudflare Dashboard**
   - Go to Pages → zeidgeist-prompter project
   - Navigate to Settings → Environment variables

2. **Add Required API Keys**
   ```
   CLAUDE_API_KEY=sk-ant-api03-[your-claude-key]
   MISTRAL_API_KEY=your-mistral-api-key
   MOONSHOT_API_KEY=your-moonshot-api-key
   ```

3. **Keep Existing Keys**
   ```
   OPENAI_API_KEY=sk-[your-openai-key]
   ```

4. **Do NOT add DeepSeek** (disabled due to formatting issues)

### 3. Update GitHub Secrets (if needed)
Ensure these secrets exist in GitHub repository settings:
- `CLAUDE_API_KEY`
- `MISTRAL_API_KEY` 
- `MOONSHOT_API_KEY`

### 4. Verify Random Selection
After adding API keys:

1. **Check logs** - The code includes extensive logging showing which provider is selected
2. **Make multiple requests** - Different providers should be used across requests
3. **Monitor provider diversity** - Should see rotation between Claude, OpenAI, Mistral, Moonshot

## Code Reference

### Provider Selection Logic
File: `functions/_shared/llm-enhancer.ts` (lines 706-789)

```typescript
// Check which API keys are configured
const availableProviders = [];

if (env.CLAUDE_API_KEY) {
  availableProviders.push({ name: 'claude', fn: enhanceWithClaude });
}
if (env.OPENAI_API_KEY) {
  availableProviders.push({ name: 'openai', fn: enhanceWithOpenAI });
}
if (env.MISTRAL_API_KEY) {
  availableProviders.push({ name: 'mistral', fn: enhanceWithMistral });
}
if (env.MOONSHOT_API_KEY) {
  availableProviders.push({ name: 'moonshot', fn: enhanceWithMoonshot });
}

// Randomly shuffle providers
const shuffledProviders = shuffleArray(availableProviders);

// Try providers in random order
for (const provider of shuffledProviders) {
  try {
    console.log(`🚀 Trying enhancement with ${provider.name}...`);
    const result = await provider.fn(prompt, context, isRefinement);
    console.log(`✅ Successfully enhanced with ${provider.name}`);
    return result;
  } catch (error) {
    console.error(`❌ ${provider.name} enhancement failed:`, error);
    continue;
  }
}
```

### Why DeepSeek is Disabled
File: `functions/_shared/llm-enhancer.ts` (lines 735-738)

```typescript
// DeepSeek disabled - too stubborn with intro/outro text despite XML constraints
// if (env.DEEPSEEK_API_KEY) {
//   availableProviders.push({ name: 'deepseek', fn: enhanceWithDeepseek });
// }
```

## Deployment Environments

### Production
- **URL**: `https://mstprmpt.zeidgeist.com`
- **Required Keys**: CLAUDE_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY, MOONSHOT_API_KEY
- **GitHub Workflow**: `deploy-production` job in `.github/workflows/ci.yml`

### Staging  
- **URL**: `https://staging.mstprmpt.zeidgeist.com`
- **Required Keys**: CLAUDE_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY
- **GitHub Workflow**: `deploy-staging` job in `.github/workflows/ci.yml`

### Preview (PR environments)
- **URL**: `https://preview-pr-{number}.zeidgeist-prompter.pages.dev`
- **Required Keys**: CLAUDE_API_KEY, OPENAI_API_KEY, MISTRAL_API_KEY
- **GitHub Workflow**: `deploy-preview` job in `.github/workflows/ci.yml`

## Testing Random Selection

### Manual Testing
1. Make multiple prompt enhancement requests
2. Check browser developer tools → Network tab → Response headers
3. Look for `X-AI-Provider` header (if implemented) or response metadata

### Automated Testing
```typescript
// Test multiple requests to verify provider diversity
const providers = new Set();
for (let i = 0; i < 10; i++) {
  const response = await fetch('/api/enhance', {
    method: 'POST',
    body: JSON.stringify({ prompt: 'test prompt' })
  });
  const result = await response.json();
  providers.add(result.source);
}
console.log('Providers used:', Array.from(providers));
```

## Model Verification

| Provider | Model | Status | Notes |
|----------|-------|--------|-------|
| Claude | `claude-3-haiku-20240307` | ✅ Active | Primary choice |
| OpenAI | `gpt-4o-mini` | ✅ Active | Reliable fallback |
| Mistral | `mistral-large-latest` | ✅ Active | Good quality |
| Moonshot | `moonshot-v1-8k` | ✅ Active | Chinese provider |
| DeepSeek | `deepseek-chat` | ❌ Disabled | Formatting issues |

## Common Issues

### 1. Only OpenAI Being Used
- **Cause**: Only OPENAI_API_KEY is configured
- **Solution**: Add CLAUDE_API_KEY, MISTRAL_API_KEY, MOONSHOT_API_KEY

### 2. All Requests Failing
- **Cause**: No API keys configured or all keys are invalid
- **Solution**: Verify at least one valid API key exists

### 3. Inconsistent Random Selection
- **Cause**: One provider consistently failing, reducing effective pool
- **Solution**: Check provider-specific error logs, verify API quotas

### 4. DeepSeek Errors
- **Cause**: DeepSeek was re-enabled but has formatting issues
- **Solution**: Keep DeepSeek disabled as intended

## Monitoring and Alerts

### Log Messages to Monitor
```
🔍 Checking API keys...
Available providers: claude, openai, mistral, moonshot
🚀 Trying enhancement with {provider}...
✅ Successfully enhanced with {provider}
❌ {provider} enhancement failed: {error}
```

### Key Metrics
- Provider usage distribution (should be roughly equal)
- Provider success rates
- Fallback to local enhancement frequency

## Security Considerations

1. **API Key Protection**: Never log full API keys, only status
2. **Debug Endpoint**: Remove `/api/debug/api-keys` after troubleshooting
3. **Environment Isolation**: Different keys for prod/staging/preview
4. **Rate Limiting**: Monitor API usage across providers

## Related Files

- `functions/_shared/llm-enhancer.ts` - Main enhancement logic
- `app/lib/llm-enhancer.ts` - Client-side version (includes Gemini)
- `.github/workflows/ci.yml` - Deployment configuration
- `env.example` - Environment variable template
- `functions/api/debug/api-keys.ts` - Diagnostic endpoint (temporary)