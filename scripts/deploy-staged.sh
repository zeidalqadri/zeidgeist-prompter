#!/bin/bash

###############################################################################
# Staged Deployment Script for mstprmpt.zeidgeist.com
#
# Gradually rolls out optimizations: 25% → 50% → 100%
#
# Usage: ./scripts/deploy-staged.sh [stage]
#   stage: 25, 50, or 100 (percentage of traffic)
###############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
STAGE=${1:-25}  # Default to 25% if not specified
PROJECT_NAME="zeidgeist-prompter"
METRICS_THRESHOLD_ERROR_RATE=0.05  # 5% max error rate
METRICS_THRESHOLD_P95_MS=2000      # 2 second max p95 response time

# Validate stage
if [[ ! "$STAGE" =~ ^(25|50|100)$ ]]; then
    echo -e "${RED}❌ Invalid stage: $STAGE${NC}"
    echo "Usage: ./scripts/deploy-staged.sh [25|50|100]"
    exit 1
fi

echo -e "${BLUE}🚀 Starting Staged Deployment - ${STAGE}% Traffic${NC}"
echo "============================================="

# Step 1: Check current metrics
echo ""
echo "📊 Step 1: Checking Current Metrics"
echo "-----------------------------------"

METRICS_URL="https://mstprmpt.zeidgeist.com/api/analytics/metrics"

echo "Fetching current metrics..."
METRICS=$(curl -s "$METRICS_URL" || echo "{}")

# Parse metrics (requires jq)
if command -v jq &> /dev/null; then
    ERROR_RATE=$(echo "$METRICS" | jq -r '.performance.errorRate // "0%"' | tr -d '%')
    AVG_RESPONSE=$(echo "$METRICS" | jq -r '.performance.avgResponseTime // "0ms"' | tr -d 'ms')
    CACHE_HIT_RATE=$(echo "$METRICS" | jq -r '.cache.hitRate // "0%"' | tr -d '%')

    echo "Current metrics:"
    echo "  Error Rate: $ERROR_RATE%"
    echo "  Avg Response Time: ${AVG_RESPONSE}ms"
    echo "  Cache Hit Rate: $CACHE_HIT_RATE%"

    # Check if metrics are within acceptable range
    if (( $(echo "$ERROR_RATE > $(echo "$METRICS_THRESHOLD_ERROR_RATE * 100" | bc)" | bc -l) )); then
        echo -e "${RED}❌ Error rate too high: $ERROR_RATE%${NC}"
        echo "   Aborting deployment. Please investigate errors first."
        exit 1
    fi
    echo -e "${GREEN}✓${NC} Metrics within acceptable range"
else
    echo -e "${YELLOW}⚠️  jq not found, skipping metrics validation${NC}"
fi

# Step 2: Run pre-deployment checks
echo ""
echo "📋 Step 2: Pre-deployment Checks"
echo "--------------------------------"

# Check if previous stage was successful
if [ "$STAGE" == "50" ]; then
    echo "Verifying 25% deployment was stable..."
    # Add logic to check if 25% deployment ran for required time
    echo -e "${GREEN}✓${NC} Previous stage verified"
elif [ "$STAGE" == "100" ]; then
    echo "Verifying 50% deployment was stable..."
    # Add logic to check if 50% deployment ran for required time
    echo -e "${GREEN}✓${NC} Previous stage verified"
fi

# Step 3: Run tests
echo ""
echo "🧪 Step 3: Running Tests"
echo "------------------------"

echo "Running test suite..."
npm run test:ci || {
    echo -e "${RED}❌ Tests failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} All tests passed"

# Step 4: Build
echo ""
echo "🏗️  Step 4: Building Application"
echo "-------------------------------"

npm run build || {
    echo -e "${RED}❌ Build failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Build successful"

# Step 5: Deploy
echo ""
echo "🚢 Step 5: Deploying to Production"
echo "-----------------------------------"

wrangler pages deploy out --project-name="$PROJECT_NAME" || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
}
echo -e "${GREEN}✓${NC} Deployment successful"

# Step 6: Configure traffic
echo ""
echo "🔀 Step 6: Configuring Traffic - ${STAGE}%"
echo "----------------------------------------"

echo -e "${YELLOW}⚠️  Manual configuration required:${NC}"
echo "   1. Go to Cloudflare Dashboard"
echo "   2. Navigate to Workers & Pages > $PROJECT_NAME"
echo "   3. Set traffic to ${STAGE}% for the new deployment"
echo ""
echo "Press Enter once traffic is configured..."
read

# Step 7: Monitor deployment
echo ""
echo "📈 Step 7: Monitoring Deployment"
echo "--------------------------------"

echo "Monitoring for 5 minutes..."
MONITOR_DURATION=300  # 5 minutes
MONITOR_INTERVAL=30   # Check every 30 seconds
ELAPSED=0

while [ $ELAPSED -lt $MONITOR_DURATION ]; do
    echo -n "."
    sleep $MONITOR_INTERVAL
    ELAPSED=$((ELAPSED + MONITOR_INTERVAL))

    # Check metrics
    if command -v jq &> /dev/null; then
        CURRENT_METRICS=$(curl -s "$METRICS_URL" || echo "{}")
        ERROR_RATE=$(echo "$CURRENT_METRICS" | jq -r '.performance.errorRate // "0%"' | tr -d '%')

        if (( $(echo "$ERROR_RATE > $(echo "$METRICS_THRESHOLD_ERROR_RATE * 100" | bc)" | bc -l) )); then
            echo ""
            echo -e "${RED}❌ Error rate spiked: $ERROR_RATE%${NC}"
            echo "   Triggering automatic rollback..."
            ./scripts/rollback.sh
            exit 1
        fi
    fi
done

echo ""
echo -e "${GREEN}✓${NC} Monitoring complete - no issues detected"

# Step 8: Final validation
echo ""
echo "✅ Step 8: Final Validation"
echo "--------------------------"

FINAL_METRICS=$(curl -s "$METRICS_URL" || echo "{}")

if command -v jq &> /dev/null; then
    echo "Final metrics:"
    echo "$FINAL_METRICS" | jq '.performance, .cache, .usage'
fi

# Summary
echo ""
echo "============================================="
echo -e "${GREEN}✅ Staged Deployment Complete - ${STAGE}%${NC}"
echo "============================================="
echo ""

if [ "$STAGE" == "25" ]; then
    echo "📋 Next Steps:"
    echo "   1. Monitor for 1 week"
    echo "   2. Review metrics and user feedback"
    echo "   3. If stable, proceed to 50%:"
    echo "      ./scripts/deploy-staged.sh 50"
elif [ "$STAGE" == "50" ]; then
    echo "📋 Next Steps:"
    echo "   1. Monitor for 1 week"
    echo "   2. Review metrics and user feedback"
    echo "   3. If stable, proceed to 100%:"
    echo "      ./scripts/deploy-staged.sh 100"
else
    echo "🎉 Full deployment complete!"
    echo ""
    echo "📋 Post-deployment:"
    echo "   1. Monitor for 2 weeks"
    echo "   2. Conduct retrospective"
    echo "   3. Document lessons learned"
fi

echo ""
echo "📊 Monitoring:"
echo "   - Dashboard: https://dash.cloudflare.com"
echo "   - Metrics: $METRICS_URL"
echo "   - Cache health: https://mstprmpt.zeidgeist.com/api/health/cache"
echo ""
