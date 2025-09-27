# Production Deployment Guide

This guide provides comprehensive instructions for deploying Zeidgeist Prompter to production.

## Prerequisites

### Required Accounts & Services
- **GitHub account** (for repository and CI/CD)
- **Cloudflare account** (for Pages/Workers hosting)
- **Database service** (Neon, PlanetScale, or PostgreSQL provider)
- **Domain name** (optional, for custom domain)

### Required Software
- Node.js 18+ 
- npm or yarn
- Git
- Cloudflare CLI (wrangler)

## Environment Setup

### 1. Database Setup

Choose your database provider:

#### Option A: Neon (Recommended)
1. Create account at [neon.tech](https://neon.tech)
2. Create a new database
3. Copy the connection string

#### Option B: PlanetScale
1. Create account at [planetscale.com](https://planetscale.com)
2. Create new database
3. Create production and staging branches
4. Generate connection strings

#### Option C: Self-hosted PostgreSQL
1. Set up PostgreSQL server
2. Create database and user
3. Configure connection string

### 2. Cloudflare Setup

#### Create Cloudflare Account
1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Get your API token from Cloudflare dashboard
3. Note your Account ID

#### Configure Custom Domain (Optional)
1. Add your domain to Cloudflare
2. Update nameservers
3. Configure DNS settings

### 3. GitHub Secrets Configuration

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

#### Required Secrets
```bash
# Cloudflare
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token

# Database URLs
PRODUCTION_DATABASE_URL=postgresql://user:pass@host:5432/db_prod
STAGING_DATABASE_URL=postgresql://user:pass@host:5432/db_staging

# Security Keys
PRODUCTION_JWT_SECRET=your_production_jwt_secret_64_chars_min
PRODUCTION_NEXTAUTH_SECRET=your_production_nextauth_secret
STAGING_JWT_SECRET=your_staging_jwt_secret
STAGING_NEXTAUTH_SECRET=your_staging_nextauth_secret

# AI Provider API Keys (CRITICAL: Multiple keys required for random selection)
# ⚠️  IMPORTANT: Configure multiple keys for proper load balancing
# If only one key is configured, that provider will be used exclusively

# Primary providers (recommended)
CLAUDE_API_KEY=sk-ant-api03-your_claude_api_key          # Primary AI provider
OPENAI_API_KEY=sk-your_openai_api_key                    # Reliable fallback
MISTRAL_API_KEY=your_mistral_api_key                     # Additional provider

# Additional providers (optional but recommended)
MOONSHOT_API_KEY=your_moonshot_api_key                   # Kimi/Moonshot provider

# ❌ DO NOT SET: DeepSeek is intentionally disabled due to formatting issues
# DEEPSEEK_API_KEY=your_deepseek_api_key                # DISABLED - causes output issues
```

#### Optional Secrets
```bash
# Monitoring
SENTRY_DSN=your_sentry_dsn
SLACK_WEBHOOK_URL=your_slack_webhook_url

# Testing  
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=test_password

# Security scanning
SNYK_TOKEN=your_snyk_token
```

## Deployment Process

### Automatic Deployment (Recommended)

The project includes automated CI/CD via GitHub Actions:

1. **Staging Deployment**: Push to `develop` branch
2. **Production Deployment**: Push to `master` branch

### Manual Deployment

#### 1. Pre-deployment Validation
```bash
# Install dependencies
npm ci

# Validate environment
npm run validate:env

# Run pre-deployment checks
npm run deploy:pre
```

#### 2. Database Migration
```bash
# Run database migrations
npm run deploy:migrate
```

#### 3. Build Application
```bash
# Build for production
npm run build
```

#### 4. Deploy to Cloudflare
```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:production
```

#### 5. Post-deployment Validation
```bash
# Validate deployment
npm run deploy:post https://your-domain.com
```

## AI Provider Configuration

### Critical Requirement: Multiple API Keys
The application uses **random provider selection** for load balancing and redundancy. This feature **requires multiple AI provider API keys** to function correctly.

#### ⚠️  Common Issue: Only OpenAI Being Used
If your deployed app only uses OpenAI for prompt enhancement, it means **only the OpenAI API key is configured**. This is the most common deployment issue.

#### Required Configuration
Configure **at least 2-3 AI provider API keys** in both:
1. **GitHub Secrets** (for CI/CD)
2. **Cloudflare Pages Environment Variables** (for runtime)

#### Supported Providers
| Provider | Status | Model | Configuration |
|----------|---------|--------|---------------|
| **Claude** | ✅ Recommended | `claude-3-haiku-20240307` | `CLAUDE_API_KEY` |
| **OpenAI** | ✅ Reliable | `gpt-4o-mini` | `OPENAI_API_KEY` |
| **Mistral** | ✅ Good Quality | `mistral-large-latest` | `MISTRAL_API_KEY` |
| **Moonshot** | ✅ Alternative | `moonshot-v1-8k` | `MOONSHOT_API_KEY` |
| **DeepSeek** | ❌ Disabled | `deepseek-chat` | Not recommended |

#### Setting Up Cloudflare Environment Variables
1. Go to **Cloudflare Dashboard** → **Pages** → **Your Project**
2. Navigate to **Settings** → **Environment variables**
3. Add variables for **both Production and Preview environments**:
   ```
   CLAUDE_API_KEY = sk-ant-api03-[your-key]
   OPENAI_API_KEY = sk-[your-key] 
   MISTRAL_API_KEY = [your-key]
   MOONSHOT_API_KEY = [your-key]
   ```

#### Verification
Use the diagnostic endpoint to verify configuration:
```bash
# For staging/preview (not available in production for security)
curl https://your-staging-url.com/api/debug/api-keys
```

### Troubleshooting AI Providers
If experiencing issues:
1. **Check logs** - Look for "Available providers: ..." messages
2. **Verify API keys** - Ensure keys are valid and have quota
3. **Test multiple requests** - Should see different providers being used
4. **Check provider status** - Verify provider APIs are operational

For detailed troubleshooting, see: `AI_PROVIDER_TROUBLESHOOTING.md`

## Environment Configuration

### Production Environment Variables

Set these in Cloudflare Workers/Pages dashboard:

```bash
# Application
NODE_ENV=production
APP_ENV=production
API_BASE_URL=https://your-domain.com

# Database
DATABASE_URL=your_production_database_url
DB_MAX_CONNECTIONS=20
DB_CONNECTION_TIMEOUT=30000

# Security
JWT_SECRET=your_production_jwt_secret
NEXTAUTH_SECRET=your_production_nextauth_secret
CORS_ORIGINS=https://your-domain.com

# Rate Limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# AI Provider API Keys (CRITICAL: Set multiple keys)
CLAUDE_API_KEY=your_claude_api_key
OPENAI_API_KEY=your_openai_api_key
MISTRAL_API_KEY=your_mistral_api_key
MOONSHOT_API_KEY=your_moonshot_api_key

# Features
ENABLE_ANALYTICS=true
ENABLE_ERROR_REPORTING=true
LOG_LEVEL=info
```

### Staging Environment Variables
Same as production but with staging-specific values:
- `APP_ENV=staging`
- `API_BASE_URL=https://staging.your-domain.com`
- Staging database URL
- Staging secrets

## Health Checks

The application provides several health check endpoints:

- **Liveness**: `/api/health/liveness` - Basic alive check
- **Readiness**: `/api/health/readiness` - Ready to serve traffic
- **Health**: `/api/health` - Comprehensive health status

### Monitoring Setup

1. **Automated Monitoring**: GitHub Actions runs health checks every 15 minutes
2. **Uptime Monitoring**: Set up external monitoring (UptimeRobot, Pingdom)
3. **Error Tracking**: Configure Sentry for error monitoring
4. **Performance**: Monitor via Cloudflare Analytics

## Security Checklist

### Before Deployment
- [ ] All secrets properly configured
- [ ] Database credentials secured
- [ ] API keys restricted to necessary permissions
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured

### After Deployment
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] No sensitive data in logs
- [ ] Health checks responding
- [ ] Error tracking configured
- [ ] Backup procedures tested

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check database URL format
# Verify database is accessible
# Check connection limits

# Test connection
npm run validate:env
```

#### 2. Build Failures
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+
```

#### 3. Environment Variables Not Loading
```bash
# Verify secrets in GitHub
# Check wrangler.api.toml configuration
# Validate environment names match
```

#### 4. AI Provider Issues - Only Using OpenAI
This is the most common deployment issue.

**Symptoms:**
- All prompt enhancements use OpenAI only
- No random provider selection occurring
- Logs show "Available providers: openai" only

**Diagnosis:**
```bash
# Check available providers (staging/preview only)
curl https://your-staging-url.com/api/debug/api-keys

# Look for these log messages in Cloudflare dashboard:
# "🔍 Checking API keys..."
# "Available providers: openai, claude, mistral, moonshot"
```

**Solution:**
1. Add missing API keys to Cloudflare Pages environment variables
2. Ensure keys are set for both Production and Preview environments  
3. Verify API key format and validity
4. Redeploy to pick up new environment variables

**Required Keys for Random Selection:**
- `CLAUDE_API_KEY` (primary)
- `MISTRAL_API_KEY` (secondary) 
- `MOONSHOT_API_KEY` (optional)
- Keep `OPENAI_API_KEY` as fallback

#### 5. Health Checks Failing
```bash
# Check deployment status
curl -f https://your-domain.com/api/health

# Review logs in Cloudflare dashboard
# Verify all required environment variables set
```

### Rollback Procedure

If deployment fails:

1. **Immediate**: Use Cloudflare rollback feature
2. **Database**: Run generated rollback script
3. **Code**: Revert to previous commit and redeploy

```bash
# Emergency rollback
git revert HEAD
git push origin master

# Or use generated rollback script
./rollback-latest.js
```

## Performance Optimization

### Cloudflare Settings
- Enable caching for static assets
- Configure compression
- Set up CDN optimization
- Enable minification

### Database Optimization
- Connection pooling configured
- Query optimization
- Index optimization
- Backup strategy in place

## Monitoring & Maintenance

### Regular Tasks
- [ ] Monitor health endpoints
- [ ] Review error logs weekly
- [ ] Check SSL certificate expiry
- [ ] Update dependencies monthly
- [ ] Review performance metrics
- [ ] Test backup/restore procedures

### Alerting Setup
Configure alerts for:
- Application downtime
- High error rates
- Database connection issues
- SSL certificate expiry
- Performance degradation

## Support

For deployment issues:
1. Check health endpoints
2. Review Cloudflare logs
3. Check GitHub Actions logs
4. Verify environment configuration
5. Test database connectivity

### Emergency Contacts
- **Production Issues**: Check `/api/health` endpoint
- **Database Issues**: Verify connection string
- **SSL Issues**: Check Cloudflare SSL settings
