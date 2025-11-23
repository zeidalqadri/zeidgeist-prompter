#!/bin/bash

# Cloudflare Infrastructure Setup Script
# This script automates the creation of R2 buckets, KV namespaces, and database migration

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_header() {
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "$1 is not installed. Please install it first."
        exit 1
    fi
}

# Welcome
print_header "Cloudflare Infrastructure Setup"
echo ""
echo "This script will set up:"
echo "  1. R2 buckets for image storage"
echo "  2. KV namespaces for progress tracking"
echo "  3. Database migration for image tables"
echo "  4. Generate environment variables template"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."
check_command "wrangler"
check_command "psql"
check_command "jq"

# Check if logged in to Wrangler
if ! wrangler whoami &> /dev/null; then
    print_error "Not logged in to Wrangler. Please run: wrangler login"
    exit 1
fi

print_success "Prerequisites satisfied"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with infrastructure setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Setup cancelled"
    exit 0
fi

# Step 1: Create R2 Buckets
print_header "Step 1: Creating R2 Buckets"

create_r2_bucket() {
    BUCKET_NAME=$1
    if wrangler r2 bucket list | grep -q "^$BUCKET_NAME$"; then
        print_warning "Bucket '$BUCKET_NAME' already exists, skipping..."
    else
        print_info "Creating bucket '$BUCKET_NAME'..."
        wrangler r2 bucket create "$BUCKET_NAME"
        print_success "Created bucket '$BUCKET_NAME'"
    fi
}

create_r2_bucket "zeidgeist-images-prod"
create_r2_bucket "zeidgeist-images-dev"

echo ""
print_success "R2 buckets configured"
echo ""

# Step 2: Create KV Namespaces
print_header "Step 2: Creating KV Namespaces"

print_info "Creating PROGRESS_TRACKER namespace (production)..."
KV_PROD_OUTPUT=$(wrangler kv:namespace create "PROGRESS_TRACKER" 2>&1 || true)

if echo "$KV_PROD_OUTPUT" | grep -q "already exists"; then
    print_warning "Production namespace already exists"
    KV_PROD_ID=$(wrangler kv:namespace list | jq -r '.[] | select(.title | contains("PROGRESS_TRACKER")) | select(.title | contains("preview") | not) | .id' | head -1)
else
    KV_PROD_ID=$(echo "$KV_PROD_OUTPUT" | grep -oP 'id = "\K[^"]+' || true)
    if [ -z "$KV_PROD_ID" ]; then
        print_error "Failed to extract production KV namespace ID"
        print_info "Output: $KV_PROD_OUTPUT"
        exit 1
    fi
    print_success "Created production namespace: $KV_PROD_ID"
fi

print_info "Creating PROGRESS_TRACKER namespace (preview)..."
KV_PREVIEW_OUTPUT=$(wrangler kv:namespace create "PROGRESS_TRACKER" --preview 2>&1 || true)

if echo "$KV_PREVIEW_OUTPUT" | grep -q "already exists"; then
    print_warning "Preview namespace already exists"
    KV_PREVIEW_ID=$(wrangler kv:namespace list | jq -r '.[] | select(.title | contains("PROGRESS_TRACKER")) | select(.title | contains("preview")) | .id' | head -1)
else
    KV_PREVIEW_ID=$(echo "$KV_PREVIEW_OUTPUT" | grep -oP 'preview_id = "\K[^"]+' || grep -oP 'id = "\K[^"]+' || true)
    if [ -z "$KV_PREVIEW_ID" ]; then
        print_error "Failed to extract preview KV namespace ID"
        print_info "Output: $KV_PREVIEW_OUTPUT"
        exit 1
    fi
    print_success "Created preview namespace: $KV_PREVIEW_ID"
fi

echo ""
print_success "KV namespaces configured"
echo ""
print_info "Production ID: $KV_PROD_ID"
print_info "Preview ID: $KV_PREVIEW_ID"
echo ""

# Step 3: Update wrangler.toml
print_header "Step 3: Updating wrangler.toml"

if [ -f "wrangler.toml" ]; then
    # Backup existing wrangler.toml
    cp wrangler.toml wrangler.toml.backup
    print_info "Backed up wrangler.toml to wrangler.toml.backup"

    # Update KV namespace IDs
    if grep -q "PROGRESS_TRACKER" wrangler.toml; then
        # Replace placeholder IDs with actual IDs
        sed -i.tmp "s/id = \"progress_tracker_prod\"/id = \"$KV_PROD_ID\"/" wrangler.toml
        sed -i.tmp "s/preview_id = \"progress_tracker_dev\"/preview_id = \"$KV_PREVIEW_ID\"/" wrangler.toml
        rm -f wrangler.toml.tmp
        print_success "Updated wrangler.toml with actual namespace IDs"
    else
        print_warning "PROGRESS_TRACKER not found in wrangler.toml, skipping update"
    fi
else
    print_error "wrangler.toml not found in current directory"
    exit 1
fi

echo ""

# Step 4: Database Migration
print_header "Step 4: Running Database Migration"

if [ -z "$DATABASE_URL" ]; then
    print_warning "DATABASE_URL environment variable not set"
    read -p "Enter your DATABASE_URL: " DATABASE_URL
    export DATABASE_URL
fi

if [ -f "migrations/001_add_image_tables.sql" ]; then
    print_info "Running database migration..."

    # Check if tables already exist
    EXISTING_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('images', 'imageGenerations', 'imageAnalyses', 'imageQuotas');" 2>&1 || echo "0")

    if [ "$EXISTING_TABLES" = "4" ]; then
        print_warning "All image tables already exist, skipping migration"
    else
        psql "$DATABASE_URL" -f migrations/001_add_image_tables.sql
        print_success "Database migration completed"

        # Verify tables were created
        CREATED_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('images', 'imageGenerations', 'imageAnalyses', 'imageQuotas');" 2>&1)
        print_info "Created $CREATED_TABLES image tables"
    fi
else
    print_error "Migration file not found: migrations/001_add_image_tables.sql"
    exit 1
fi

echo ""

# Step 5: Generate Environment Variables Template
print_header "Step 5: Environment Variables Template"

ENV_TEMPLATE=$(cat <<'EOF'
# ================================================
# Cloudflare Pages Environment Variables
# ================================================
# Add these to: Cloudflare Dashboard → Pages → Settings → Environment Variables

# AI Provider API Keys (REQUIRED)
OPENAI_API_KEY=sk-...your-openai-key...
CLAUDE_API_KEY=sk-ant-...your-claude-key...
STABILITY_AI_KEY=sk-...your-stability-key...
GOOGLE_API_KEY=...your-google-key...

# Storage Configuration (REQUIRED)
R2_PUBLIC_URL=https://images.mstprmpt.zeidgeist.com

# Security (OPTIONAL - falls back to header validation)
VIRUSTOTAL_API_KEY=...your-virustotal-key...

# Database (REQUIRED - should already be set)
DATABASE_URL=postgresql://...your-database-url...

# Auth (REQUIRED - should already be set)
JWT_SECRET=...your-jwt-secret...
NEXTAUTH_SECRET=...your-nextauth-secret...
VALID_API_KEYS=...your-api-keys...

# ================================================
# Next Steps:
# ================================================
# 1. Copy these variables to Cloudflare Dashboard
# 2. Replace placeholder values with actual API keys
# 3. Add for both Production and Preview environments
# 4. Save and deploy
EOF
)

echo "$ENV_TEMPLATE" > .env.cloudflare.template
print_success "Created .env.cloudflare.template"
echo ""
print_info "Template saved to: .env.cloudflare.template"
echo ""

# Step 6: Verify Bindings in Cloudflare Dashboard
print_header "Step 6: Manual Binding Configuration Required"

echo ""
print_warning "⚠️  IMPORTANT: You must manually configure bindings in Cloudflare Dashboard"
echo ""
echo "Go to: https://dash.cloudflare.com → Workers & Pages → aipromptise → Settings → Functions"
echo ""
echo "Add these bindings:"
echo ""
echo "1. R2 Bucket Bindings:"
echo "   - Variable name: IMAGE_STORAGE"
echo "   - Production bucket: zeidgeist-images-prod"
echo "   - Preview bucket: zeidgeist-images-dev"
echo ""
echo "2. KV Namespace Bindings:"
echo "   - Variable name: PROGRESS_TRACKER"
echo "   - Production namespace ID: $KV_PROD_ID"
echo "   - Preview namespace ID: $KV_PREVIEW_ID"
echo ""

# Summary
print_header "Setup Summary"

echo ""
echo "✅ R2 Buckets:"
echo "   - zeidgeist-images-prod"
echo "   - zeidgeist-images-dev"
echo ""
echo "✅ KV Namespaces:"
echo "   - Production: $KV_PROD_ID"
echo "   - Preview: $KV_PREVIEW_ID"
echo ""
echo "✅ Database:"
echo "   - Migration completed"
echo "   - 4 tables created (images, imageGenerations, imageAnalyses, imageQuotas)"
echo ""
echo "✅ Files:"
echo "   - wrangler.toml updated"
echo "   - .env.cloudflare.template created"
echo ""

print_header "Next Steps"

echo ""
echo "1. Configure Bindings (Manual):"
echo "   - Go to Cloudflare Dashboard → Pages → Settings → Functions"
echo "   - Add R2 and KV bindings as shown above"
echo ""
echo "2. Set Environment Variables (Manual):"
echo "   - Go to Cloudflare Dashboard → Pages → Settings → Environment Variables"
echo "   - Copy values from .env.cloudflare.template"
echo "   - Add for both Production and Preview"
echo "   - Replace placeholder values with actual API keys"
echo ""
echo "3. Deploy:"
echo "   - Push to GitHub (triggers automatic deployment)"
echo "   - Or deploy manually: npm run build && wrangler pages deploy out"
echo ""
echo "4. Test:"
echo "   - Check preview deployment URL in PR"
echo "   - Test quota endpoint: curl \$PREVIEW_URL/api/images/quota"
echo "   - Test image upload"
echo ""

print_success "Infrastructure setup completed!"
echo ""
print_info "For detailed instructions, see: INFRASTRUCTURE_SETUP.md"
echo ""
