# Fix for History API 500 Error - Missing DATABASE_URL

## Problem
The `/api/engineer/history-dual-mode` endpoint returns 500 error because the DATABASE_URL environment variable is not configured in Cloudflare Pages.

## Root Cause
The Cloudflare Functions are trying to connect to the database but the DATABASE_URL environment variable is not available at runtime, causing:
```
Error: DATABASE_URL environment variable is required
```

## Solution Applied

### 1. Enhanced Error Handling
Added explicit checks for DATABASE_URL with clear error messages:
- Returns 503 (Service Unavailable) when DATABASE_URL is missing
- Provides detailed error messages to help diagnose the issue
- Wraps database connection creation in try-catch blocks

### 2. Health Check Endpoint
Created `/api/engineer/history-health` endpoint to diagnose configuration issues:
```bash
curl https://your-domain.pages.dev/api/engineer/history-health
```

This will show:
- Environment variable status
- Database connectivity
- Module loading status

## Required Configuration in Cloudflare Pages Dashboard

### Step 1: Go to Cloudflare Pages Settings
1. Visit: https://dash.cloudflare.com
2. Navigate to: **Pages** → **your-project** → **Settings** → **Environment variables**

### Step 2: Add DATABASE_URL
Click "Add variable" and add:
- **Variable name:** `DATABASE_URL`
- **Value:** Your Neon database connection string (get from Neon dashboard)
- **Environment:** Production (and Preview if needed)

The DATABASE_URL should look like:
```
postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/database-name?sslmode=require
```

### Step 3: Add Other Required Variables (if not already set)
- `JWT_SECRET` - For authentication
- `NEXTAUTH_SECRET` - For session management
- `USER_AUTH_ENABLED` - Set to "true" or "false"
- `IP_FALLBACK_ENABLED` - Set to "true" or "false"
- `DUAL_MODE_ENABLED` - Set to "true" or "false"

### Step 4: Redeploy
After adding the environment variables:
1. Go to **Deployments** tab
2. Click "Retry deployment" on the latest deployment
3. OR push a new commit to trigger deployment

## Testing the Fix

### 1. Check Health Status
```bash
curl https://your-domain.pages.dev/api/engineer/history-health | jq .
```

Expected response when properly configured:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-03T10:00:00.000Z",
  "checks": {
    "environment": {
      "DATABASE_URL": true,
      "USER_AUTH_ENABLED": "false",
      "IP_FALLBACK_ENABLED": "true"
    },
    "database": {
      "status": "connected",
      "test": "success"
    }
  }
}
```

### 2. Test History Endpoint
```bash
# GET request
curl https://your-domain.pages.dev/api/engineer/history-dual-mode

# POST request
curl -X POST https://your-domain.pages.dev/api/engineer/history-dual-mode \
  -H "Content-Type: application/json" \
  -d '{"original": "test", "refined": "test enhanced"}'
```

## Files Modified
1. `functions/api/engineer/history-dual-mode.ts` - Added DATABASE_URL validation and error handling
2. `functions/api/engineer/history-health.ts` - New health check endpoint for diagnostics

## Common Issues and Solutions

### Issue 1: Still getting 500 after adding DATABASE_URL
**Cause:** The connection string might be incorrect or the database might not be accessible.
**Solution:**
- Verify the DATABASE_URL format
- Check that SSL mode is set to `require`
- Ensure the database is active in Neon dashboard

### Issue 2: Authentication errors
**Cause:** Missing JWT_SECRET or NEXTAUTH_SECRET
**Solution:** Add these environment variables to Cloudflare Pages

### Issue 3: CORS errors
**Cause:** Origin not allowed
**Solution:** The code already handles CORS properly, but ensure your domain is in the allowed list

## Security Notes
- Never commit DATABASE_URL to git
- Use Cloudflare's environment variables for all secrets
- The DATABASE_URL should use SSL (sslmode=require)
- Consider using different database URLs for production and preview environments