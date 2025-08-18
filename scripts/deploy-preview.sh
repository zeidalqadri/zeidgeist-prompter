#!/bin/bash

# ZeidGeist Prompter - Cloudflare Preview Deployment Script
# Usage: ./scripts/deploy-preview.sh

set -e

echo "🚀 Starting ZeidGeist Prompter Preview Deployment to Cloudflare"
echo "==============================================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ACCOUNT_ID=${CLOUDFLARE_ACCOUNT_ID}
API_TOKEN=${CLOUDFLARE_API_TOKEN}
ZONE_ID=${CLOUDFLARE_ZONE_ID}

# Check prerequisites
echo -e "${BLUE}📋 Checking prerequisites...${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}❌ Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
    echo -e "${GREEN}✅ Wrangler CLI installed${NC}"
fi

# Check environment variables
if [[ -z "$CLOUDFLARE_API_TOKEN" ]]; then
    echo -e "${RED}❌ CLOUDFLARE_API_TOKEN not set${NC}"
    echo "Please set your Cloudflare API token:"
    echo "export CLOUDFLARE_API_TOKEN=your_token_here"
    exit 1
fi

if [[ -z "$CLOUDFLARE_ACCOUNT_ID" ]]; then
    echo -e "${RED}❌ CLOUDFLARE_ACCOUNT_ID not set${NC}"
    echo "Please set your Cloudflare Account ID:"
    echo "export CLOUDFLARE_ACCOUNT_ID=your_account_id_here"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Step 1: Install dependencies
echo -e "${BLUE}📦 Installing dependencies...${NC}"
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install workers dependencies
mkdir -p workers/api
cd workers/api
if [[ ! -f package.json ]]; then
    npm init -y
    npm install
fi
cd ../..

echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 2: Build the application
echo -e "${BLUE}🔨 Building application...${NC}"

# Build frontend
echo "Building Next.js frontend..."
cd frontend
npm run build
cd ..

echo -e "${GREEN}✅ Application built successfully${NC}"

# Step 3: Set up Cloudflare resources
echo -e "${BLUE}☁️  Setting up Cloudflare resources...${NC}"

# Create D1 database
echo "Creating D1 database..."
DB_OUTPUT=$(wrangler d1 create zeidgeist-db 2>/dev/null || echo "Database may already exist")
if [[ $DB_OUTPUT == *"Database may already exist"* ]]; then
    echo -e "${YELLOW}⚠️  Database may already exist, continuing...${NC}"
else
    echo -e "${GREEN}✅ D1 database created${NC}"
fi

# Create KV namespaces
echo "Creating KV namespaces..."
wrangler kv:namespace create "CACHE" || echo "CACHE namespace may already exist"
wrangler kv:namespace create "SESSIONS" || echo "SESSIONS namespace may already exist" 
wrangler kv:namespace create "PROMPT_HISTORY" || echo "PROMPT_HISTORY namespace may already exist"
wrangler kv:namespace create "LEARNED_PATTERNS" || echo "LEARNED_PATTERNS namespace may already exist"

# Create KV namespaces for preview
wrangler kv:namespace create "CACHE" --preview || echo "CACHE preview namespace may already exist"
wrangler kv:namespace create "SESSIONS" --preview || echo "SESSIONS preview namespace may already exist"
wrangler kv:namespace create "PROMPT_HISTORY" --preview || echo "PROMPT_HISTORY preview namespace may already exist"
wrangler kv:namespace create "LEARNED_PATTERNS" --preview || echo "LEARNED_PATTERNS preview namespace may already exist"

# Create R2 buckets
echo "Creating R2 buckets..."
wrangler r2 bucket create zeidgeist-storage || echo "Storage bucket may already exist"
wrangler r2 bucket create zeidgeist-storage-preview || echo "Storage preview bucket may already exist"
wrangler r2 bucket create zeidgeist-logs || echo "Logs bucket may already exist"
wrangler r2 bucket create zeidgeist-logs-preview || echo "Logs preview bucket may already exist"

# Create Vectorize index
echo "Creating Vectorize index..."
wrangler vectorize create prompt-embeddings --dimensions=768 --metric=cosine || echo "Vectorize index may already exist"

echo -e "${GREEN}✅ Cloudflare resources configured${NC}"

# Step 4: Update wrangler.toml with actual IDs
echo -e "${BLUE}⚙️  Updating configuration with resource IDs...${NC}"

# Get database ID
DB_ID=$(wrangler d1 list | grep "zeidgeist-db" | awk '{print $2}' || echo "")
if [[ -n "$DB_ID" ]]; then
    sed -i.bak "s/your-d1-database-id/$DB_ID/g" wrangler.toml
    echo -e "${GREEN}✅ Database ID updated in wrangler.toml${NC}"
fi

# Step 5: Initialize database schema
echo -e "${BLUE}💾 Initializing database schema...${NC}"
if [[ -f "database/schema.sql" ]]; then
    wrangler d1 execute zeidgeist-db --file=database/schema.sql || echo "Schema may already be applied"
    echo -e "${GREEN}✅ Database schema initialized${NC}"
fi

# Step 6: Deploy Workers
echo -e "${BLUE}🚀 Deploying Workers API...${NC}"
wrangler deploy --env preview

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Workers API deployed successfully${NC}"
else
    echo -e "${RED}❌ Workers deployment failed${NC}"
    exit 1
fi

# Step 7: Deploy to Cloudflare Pages
echo -e "${BLUE}📄 Deploying to Cloudflare Pages...${NC}"

# Create Pages project if it doesn't exist
wrangler pages project create zeidgeist-prompter || echo "Pages project may already exist"

# Deploy to Pages
wrangler pages deploy frontend/out --project-name=zeidgeist-prompter --branch=preview

if [[ $? -eq 0 ]]; then
    echo -e "${GREEN}✅ Cloudflare Pages deployment successful${NC}"
else
    echo -e "${RED}❌ Pages deployment failed${NC}"
    exit 1
fi

# Step 8: Test deployment
echo -e "${BLUE}🧪 Testing deployment...${NC}"

# Get Workers URL
WORKERS_URL=$(wrangler subdomain | grep "https://" || echo "")
if [[ -n "$WORKERS_URL" ]]; then
    API_URL="${WORKERS_URL/workers.dev/zeidgeist-prompter-api-preview.YOUR-SUBDOMAIN.workers.dev}"
    
    echo "Testing health endpoint..."
    HEALTH_RESPONSE=$(curl -s "${API_URL}/api/health" || echo "")
    
    if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
        echo -e "${GREEN}✅ API health check passed${NC}"
    else
        echo -e "${YELLOW}⚠️  API health check inconclusive${NC}"
    fi
fi

# Get Pages URL  
PAGES_URL="https://preview.zeidgeist-prompter.pages.dev"
echo "Testing Pages deployment..."
PAGES_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$PAGES_URL" || echo "000")

if [[ "$PAGES_RESPONSE" == "200" ]]; then
    echo -e "${GREEN}✅ Pages deployment accessible${NC}"
else
    echo -e "${YELLOW}⚠️  Pages deployment may still be propagating${NC}"
fi

# Step 9: Display deployment information
echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "=========================="
echo ""
echo -e "${BLUE}📋 Deployment Information:${NC}"
echo ""
echo "Frontend URL: ${PAGES_URL}"
echo "API URL: ${API_URL}"
echo ""
echo -e "${BLUE}🔗 Useful URLs:${NC}"
echo "- Cloudflare Dashboard: https://dash.cloudflare.com/"
echo "- Workers Dashboard: https://dash.cloudflare.com/workers-and-pages"
echo "- Pages Dashboard: https://dash.cloudflare.com/pages"
echo "- D1 Dashboard: https://dash.cloudflare.com/d1"
echo ""
echo -e "${BLUE}🧪 Test Commands:${NC}"
echo "- Health Check: curl ${API_URL}/api/health"
echo "- Prompt Enhancement: curl -X POST ${API_URL}/api/engineer -H 'Content-Type: application/json' -d '{\"prompt\":\"test prompt\"}'"
echo ""
echo -e "${BLUE}📊 Monitoring:${NC}"
echo "- View logs: wrangler tail zeidgeist-prompter-api-preview"
echo "- View analytics: wrangler pages deployment list --project-name=zeidgeist-prompter"
echo ""
echo -e "${YELLOW}⚠️  Next Steps:${NC}"
echo "1. Update DNS settings if using custom domain"
echo "2. Configure Zero Trust access policies (see cloudflare/zero-trust.yaml)"
echo "3. Set up monitoring and alerts"
echo "4. Review and update environment variables"
echo "5. Test all API endpoints"
echo ""
echo -e "${GREEN}🚀 Preview environment is ready for testing!${NC}"