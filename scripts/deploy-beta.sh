#!/bin/bash

###############################################################################
# Beta Deployment Script for mstprmpt.zeidgeist.com
#
# This script deploys optimizations to a beta environment with traffic splitting
#
# Usage: ./scripts/deploy-beta.sh
###############################################################################

set -e  # Exit on error

echo "🚀 Starting Beta Deployment..."
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BETA_PERCENTAGE=${BETA_PERCENTAGE:-10}  # Default 10% traffic
PROJECT_NAME="zeidgeist-prompter"

# Step 1: Pre-deployment checks
echo ""
echo "📋 Step 1: Pre-deployment Checks"
echo "--------------------------------"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Please install it first:${NC}"
    echo "   npm install -g wrangler"
    exit 1
fi

echo -e "${GREEN}✓${NC} Wrangler CLI found"

# Check if logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare. Logging in...${NC}"
    wrangler login
fi

echo -e "${GREEN}✓${NC} Logged in to Cloudflare"

# Step 2: Run tests
echo ""
echo "🧪 Step 2: Running Tests"
echo "------------------------"

echo "Running unit tests..."
npm run test:unit || {
    echo -e "${RED}❌ Unit tests failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Unit tests passed"

echo "Running integration tests..."
npm run test:integration || {
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Integration tests passed"

# Step 3: Build application
echo ""
echo "🏗️  Step 3: Building Application"
echo "-------------------------------"

npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Build successful"

# Step 4: Create KV namespaces if they don't exist
echo ""
echo "💾 Step 4: Setting up KV Namespaces"
echo "-----------------------------------"

# Check and create CACHE_STORAGE namespace
if ! wrangler kv:namespace list | grep -q "CACHE_STORAGE"; then
    echo "Creating CACHE_STORAGE namespace..."
    wrangler kv:namespace create "CACHE_STORAGE"
    wrangler kv:namespace create "CACHE_STORAGE" --preview
    echo -e "${YELLOW}⚠️  Please update wrangler.toml with the KV namespace IDs${NC}"
else
    echo -e "${GREEN}✓${NC} CACHE_STORAGE namespace exists"
fi

# Check and create SESSION_STORAGE namespace
if ! wrangler kv:namespace list | grep -q "SESSION_STORAGE"; then
    echo "Creating SESSION_STORAGE namespace..."
    wrangler kv:namespace create "SESSION_STORAGE"
    wrangler kv:namespace create "SESSION_STORAGE" --preview
    echo -e "${YELLOW}⚠️  Please update wrangler.toml with the KV namespace IDs${NC}"
else
    echo -e "${GREEN}✓${NC} SESSION_STORAGE namespace exists"
fi

# Step 5: Deploy to beta environment
echo ""
echo "🚢 Step 5: Deploying to Beta Environment"
echo "----------------------------------------"

# Deploy to Cloudflare Pages with beta tag
wrangler pages deploy out --project-name="$PROJECT_NAME" --branch=beta || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
}

echo -e "${GREEN}✓${NC} Deployed to beta environment"

# Step 6: Configure traffic splitting
echo ""
echo "🔀 Step 6: Configuring Traffic Splitting"
echo "----------------------------------------"

echo "Setting up $BETA_PERCENTAGE% traffic to beta..."
# Note: Traffic splitting is configured in Cloudflare dashboard
# This is a placeholder for the API call

echo -e "${YELLOW}⚠️  Manual step required:${NC}"
echo "   1. Go to Cloudflare Dashboard"
echo "   2. Navigate to Pages > $PROJECT_NAME > Settings"
echo "   3. Configure traffic splitting: $BETA_PERCENTAGE% to beta branch"

# Step 7: Run smoke tests
echo ""
echo "🔥 Step 7: Running Smoke Tests"
echo "------------------------------"

# Wait for deployment to propagate
echo "Waiting 30 seconds for deployment to propagate..."
sleep 30

# Run basic health check
BETA_URL="https://beta.mstprmpt.zeidgeist.com" # Adjust based on your setup

echo "Testing beta endpoint..."
if curl -s -f "$BETA_URL/api/health" > /dev/null; then
    echo -e "${GREEN}✓${NC} Health check passed"
else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "   Please verify the deployment manually"
fi

# Step 8: Setup monitoring
echo ""
echo "📊 Step 8: Setting up Monitoring"
echo "--------------------------------"

echo "Monitoring dashboard: https://dash.cloudflare.com"
echo "Metrics endpoint: $BETA_URL/api/analytics/metrics"
echo "Cache health: $BETA_URL/api/health/cache"

# Summary
echo ""
echo "================================"
echo -e "${GREEN}✅ Beta Deployment Complete!${NC}"
echo "================================"
echo ""
echo "📋 Next Steps:"
echo "   1. Monitor beta environment for 2 weeks"
echo "   2. Check metrics at $BETA_URL/api/analytics/metrics"
echo "   3. Collect user feedback"
echo "   4. Review error rates and performance"
echo "   5. If stable, proceed with staged rollout"
echo ""
echo "📈 Monitoring:"
echo "   - Cache hit rate"
echo "   - Response times (p95, p99)"
echo "   - Error rates"
echo "   - LLM vs cache usage"
echo ""
echo "🔄 To rollback:"
echo "   ./scripts/rollback-beta.sh"
echo ""
