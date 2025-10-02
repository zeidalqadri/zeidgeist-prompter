# Cloudflare Pages Configuration Fix

## Problem
Production site (`mstprmpt.zeidgeist.com`) returns "Failed to execute 'json' on 'Response'" error because API routes return 404 HTML instead of JSON.

## Root Cause
Cloudflare Pages is not recognizing the `/functions` directory and is looking for `.open-next/assets` instead of the `out` directory.

## Solution: Manual Dashboard Configuration

### Step 1: Go to Cloudflare Pages Settings
1. Visit: https://dash.cloudflare.com
2. Navigate to: **Pages** → **aipromptise** → **Settings** → **Builds & deployments**

### Step 2: Configure Build Settings
Set the following:

**Framework preset:** `Next.js (Static HTML Export)`

**Build command:**
```
npm run build
```

**Build output directory:**
```
out
```

**Root directory:** (leave empty or `/`)

### Step 3: Environment Variables
Ensure these are set in **Settings** → **Environment variables** → **Production**:

- `JWT_SECRET` = `092RPZ0/bcSY1jRyo3ZsZmPfvBBtqi2dXq4YL0TxHRc=`
- `NEXTAUTH_SECRET` = `jIST5TkVQqT1Z+nF0haU+0nGW+A4zfa+YZ0WlNciAeU=`
- `APP_ENV` = `production`
- `NODE_ENV` = `production`
- `DATABASE_URL` = (your Neon database URL)

### Step 4: Functions Configuration
**IMPORTANT:** Do NOT disable Functions. The `/functions` directory contains your API routes.

In **Settings** → **Functions**:
- Compatibility date: `2024-01-15`
- Compatibility flags: Add `nodejs_compat`

### Step 5: Retry Deployment
1. Go to **Deployments** tab
2. Click "Retry deployment" on the latest failed deployment
3. OR trigger new deployment:
   ```bash
   git commit --allow-empty -m "trigger: redeploy with correct settings"
   git push origin main
   ```

## Expected Result
- Build output goes to `out/` directory ✅
- Functions from `/functions` are deployed ✅
- API routes (`/api/*`) return JSON ✅
- Frontend can fetch API data ✅

## Verification
After deployment succeeds, test:
```bash
curl https://mstprmpt.zeidgeist.com/api/health | jq .
```

Should return JSON with status, not 404 HTML.

## Alternative: If Dashboard Config Doesn't Work

The `wrangler.toml` in project root should automatically configure this, but if Cloudflare ignores it:

1. Delete the Pages project
2. Recreate it with correct settings from the start
3. OR deploy using wrangler CLI:
   ```bash
   npx wrangler pages deploy out --project-name=aipromptise
   ```

## Current Status
- ✅ Code is correct and builds successfully
- ✅ `wrangler.toml` specifies `pages_build_output_dir = "out"`
- ✅ Functions directory is enabled with all API routes
- ✅ Environment secrets are configured
- ❌ Cloudflare Pages auto-detection is misconfigured
- ❌ Manual dashboard configuration needed

## Files Modified (All Committed to Main)
- `wrangler.toml` - Added pages_build_output_dir
- `functions/` - Re-enabled (was functions.disabled)
- `scripts/build-cloudflare.js` - Outputs to `out/`
- `functions/package.json` - Added dependencies

