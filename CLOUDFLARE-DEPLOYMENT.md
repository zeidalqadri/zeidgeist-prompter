# Cloudflare Pages Deployment Guide

## Overview
This project is configured for deployment on Cloudflare Pages with Functions support for database operations and LLM API calls.

## ✅ Fixed Configuration

### 1. Next.js Configuration (`next.config.js`)
- ✅ `output: 'export'` for static generation
- ✅ `images: { unoptimized: true }` for Cloudflare compatibility  
- ✅ Build ignores for faster deployment

### 2. Routing Configuration (`_routes.json`)
- ✅ API routes handled by Functions: `/api/*`
- ✅ Static assets served directly
- ✅ Proper exclusions for performance

### 3. Wrangler Configuration (`wrangler.api.toml`)
- ✅ Node.js compatibility enabled
- ✅ Environment variable bindings
- ✅ Proper build commands

### 4. Functions Structure
- ✅ Functions in `/functions` directory
- ✅ Compatible with Cloudflare Pages Functions format
- ✅ Database integration with Neon/Drizzle ORM

## 🚀 Deployment Steps

### Prerequisites
1. Cloudflare account with Pages access
2. Wrangler CLI installed: `npm install -g wrangler`
3. Database URL from Neon Database

### Environment Variables Setup
Set these secrets via Cloudflare dashboard or Wrangler CLI:

```bash
# Required
wrangler secret put DATABASE_URL
# Enter your Neon database URL

# Optional LLM API Keys
wrangler secret put DEEPSEEK_API_KEY
wrangler secret put MISTRAL_API_KEY
```

### Build Process
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name aipromptise
```

### Automatic Deployment
Connect your repository to Cloudflare Pages:
1. Go to Cloudflare Dashboard > Pages
2. Connect to Git repository
3. Set build command: `npm run build`
4. Set build output directory: `dist`
5. Set root directory: `.conductor/london`

## 🔧 Functions Overview

### API Endpoints
- `POST /api/engineer` - Main prompt enhancement
- `POST /api/engineer/feedback` - User feedback collection  
- `GET /api/engineer/history` - Enhancement history

### Database Schema
- `prompt_history` - Historical prompts and enhancements
- `feedback` - User feedback on enhancements
- `enhancement_logs` - Processing logs and analytics

## 🛠️ Local Development

```bash
# Start development server
npm run dev

# Test build locally
npm run build

# Preview built site
npx serve dist
```

## 📊 Monitoring

### Logs
- Function logs available in Cloudflare dashboard
- Database operations logged to console
- Error handling with fallbacks

### Analytics
- Built-in Cloudflare Pages analytics
- Custom enhancement tracking in database
- Performance monitoring via processing times

## 🚨 Troubleshooting

### Build Failures
- Ensure `npm install` ran successfully
- Check TypeScript errors: `npm run lint`
- Verify environment variables are set

### Function Errors
- Check DATABASE_URL secret is set correctly
- Verify API keys for LLM providers
- Monitor function logs in Cloudflare dashboard

### Database Issues
- Test connection with Neon dashboard
- Check IP allowlist settings
- Verify schema migrations completed

## 🔗 Useful Commands

```bash
# Check wrangler authentication
wrangler whoami

# View secrets
wrangler secret list

# Deploy specific functions
wrangler pages functions build

# View deployment logs
wrangler pages deployment list
```

## ✨ Features Supported

- ✅ Static site hosting
- ✅ Serverless functions
- ✅ Database integration
- ✅ Environment variables
- ✅ Custom routing
- ✅ Error handling
- ✅ LLM API integration
- ✅ Analytics and logging
