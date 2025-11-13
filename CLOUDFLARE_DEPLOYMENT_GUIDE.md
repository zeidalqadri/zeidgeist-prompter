# Cloudflare Pages Deployment Guide

## Current Status
- **Project Name**: aipromptise
- **Branch**: image-gen-vision-api (preview)
- **Build Output**: `out/`
- **Functions**: `functions/`

## Cloudflare Pages Build Configuration

### Build Settings
These should be configured in the Cloudflare Pages dashboard:

```
Framework preset: Next.js (Static HTML Export)
Build command: npm run build
Build output directory: out
Root directory: (leave empty)
```

### Environment Variables Required

Add these in Cloudflare Pages dashboard → Settings → Environment Variables:

#### Production & Preview Environments:

**Database:**
```
DATABASE_URL=postgresql://...
```

**AI Provider API Keys:**
```
OPENAI_API_KEY=sk-...
CLAUDE_API_KEY=sk-ant-...
STABILITY_AI_KEY=sk-...
GOOGLE_API_KEY=...
```

**Security (Optional):**
```
VIRUSTOTAL_API_KEY=...
```

**Storage:**
```
R2_PUBLIC_URL=https://images.mstprmpt.zeidgeist.com
```

**Authentication:**
```
JWT_SECRET=...
NEXTAUTH_SECRET=...
VALID_API_KEYS=key1,key2,key3
```

### R2 Buckets Configuration

1. Go to Cloudflare Dashboard → R2
2. Create buckets:
   - **Production**: `zeidgeist-images-prod`
   - **Preview**: `zeidgeist-images-dev`

3. Bind to Pages project:
   - Go to Pages → aipromptise → Settings → Functions
   - Add R2 bucket bindings:
     - Variable name: `IMAGE_STORAGE`
     - Production bucket: `zeidgeist-images-prod`
     - Preview bucket: `zeidgeist-images-dev`

### KV Namespaces Configuration

1. Go to Cloudflare Dashboard → Workers & Pages → KV
2. Create KV namespaces:
   - **Production**: `progress_tracker_prod`
   - **Preview**: `progress_tracker_dev`

3. Bind to Pages project:
   - Go to Pages → aipromptise → Settings → Functions
   - Add KV namespace bindings:
     - Variable name: `PROGRESS_TRACKER`
     - Production namespace: `progress_tracker_prod`
     - Preview namespace: `progress_tracker_dev`

### Node.js Version

Set in Cloudflare Pages dashboard:
```
Environment variable: NODE_VERSION
Value: 20
```

## Troubleshooting Deployment Failures

### 1. Build Fails with "Module not found"
**Solution**: Ensure all dependencies are in `package.json` (not devDependencies for runtime deps)

### 2. Functions Fail to Deploy
**Solution**:
- Check that `compatibility_flags = ["nodejs_compat"]` is in wrangler.toml
- Verify all environment variables are set
- Check Functions → Logs in Cloudflare dashboard

### 3. R2/KV Bindings Not Working
**Solution**:
- Verify buckets/namespaces exist
- Confirm bindings are configured in Settings → Functions
- Check binding names match wrangler.toml exactly

### 4. Database Connection Fails
**Solution**:
- Verify DATABASE_URL is set correctly
- For Neon: Use pooled connection string
- Test connection from Cloudflare Workers

## Manual Deployment (if GitHub integration fails)

```bash
# 1. Build the application
npm run build

# 2. Deploy to Cloudflare Pages
npx wrangler pages deploy out \\
  --project-name=aipromptise \\
  --branch=image-gen-vision-api \\
  --commit-dirty=true

# Note: This requires wrangler authentication
# Run: npx wrangler login
```

## Viewing Deployment Status

1. **Cloudflare Dashboard**: https://dash.cloudflare.com/?to=/dce69acde9df39cfd032f942d9ff477c/pages/view/aipromptise
2. **Build Logs**: Pages → aipromptise → View build logs
3. **Function Logs**: Pages → aipromptise → Functions → Real-time logs

## Preview URL Pattern

Preview deployments are accessible at:
```
https://[commit-hash].aipromptise.pages.dev
```

## Testing the Deployment

After successful deployment:

1. **Health Check**:
   ```bash
   curl https://[preview-url]/api/health
   ```

2. **Test Image Upload** (requires auth):
   ```bash
   curl -X POST https://[preview-url]/api/images/quota \\
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

3. **Check Functions**:
   - Navigate to Functions tab in Cloudflare dashboard
   - View real-time logs
   - Check for errors

## Common Errors & Fixes

### Error: "Cannot find module 'drizzle-orm'"
**Fix**: Dependencies must be in `dependencies`, not `devDependencies`

### Error: "R2 bucket not found"
**Fix**: Create bucket and verify binding configuration

### Error: "KV namespace not found"
**Fix**: Create KV namespace and verify binding

### Error: "Database connection timeout"
**Fix**: Use Neon pooled connection string, not direct

### Error: "Build exceeded memory limit"
**Fix**: Optimize build by excluding unnecessary files in `.gitignore`

## Next Steps

1. ✅ Verify build succeeds locally: `npm run build`
2. ✅ Check Cloudflare dashboard for deployment status
3. ⏳ Ensure all environment variables are set
4. ⏳ Verify R2 buckets exist and are bound
5. ⏳ Verify KV namespaces exist and are bound
6. ⏳ Test preview deployment URL
