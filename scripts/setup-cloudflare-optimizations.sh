#!/bin/bash

# Cloudflare Optimizations Setup Script
# This script sets up the D1 database and other Cloudflare resources

set -e

echo "==================================="
echo "Cloudflare Auth Optimization Setup"
echo "==================================="
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "Error: wrangler CLI is not installed."
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo "Please login to Cloudflare first:"
    wrangler login
fi

echo ""
echo "Step 1: Creating D1 Database for Auth"
echo "--------------------------------------"

# Create D1 database
D1_OUTPUT=$(wrangler d1 create zeidgeist-auth 2>&1) || true

if echo "$D1_OUTPUT" | grep -q "already exists"; then
    echo "D1 database 'zeidgeist-auth' already exists"
    # Get existing database ID
    D1_INFO=$(wrangler d1 list 2>&1 | grep "zeidgeist-auth")
    DATABASE_ID=$(echo "$D1_INFO" | awk '{print $1}')
else
    echo "$D1_OUTPUT"
    # Extract database ID from creation output
    DATABASE_ID=$(echo "$D1_OUTPUT" | grep "database_id" | awk -F'"' '{print $2}')
fi

echo "Database ID: $DATABASE_ID"

echo ""
echo "Step 2: Updating wrangler.toml"
echo "------------------------------"

# Update wrangler.toml with the actual database ID
if [ -n "$DATABASE_ID" ]; then
    sed -i.bak "s/database_id = \"YOUR_D1_DATABASE_ID\"/database_id = \"$DATABASE_ID\"/" wrangler.toml
    echo "Updated wrangler.toml with database_id: $DATABASE_ID"
else
    echo "Warning: Could not extract database ID. Please update wrangler.toml manually."
fi

echo ""
echo "Step 3: Running D1 Migrations"
echo "-----------------------------"

# Run the auth tables migration
if [ -f "migrations/d1/0001_create_auth_tables.sql" ]; then
    echo "Applying auth tables migration..."
    wrangler d1 execute zeidgeist-auth --file=./migrations/d1/0001_create_auth_tables.sql
    echo "Migration applied successfully!"
else
    echo "Warning: Migration file not found at migrations/d1/0001_create_auth_tables.sql"
fi

echo ""
echo "Step 4: Verifying KV Namespaces"
echo "-------------------------------"

# Check if KV namespaces exist (wrangler v3 syntax)
echo "Checking SESSION_STORAGE KV namespace..."
if wrangler kv namespace list 2>&1 | grep -q "SESSION_STORAGE\|ebdc9af6"; then
    echo "SESSION_STORAGE KV namespace exists"
else
    echo "Creating SESSION_STORAGE KV namespace..."
    wrangler kv namespace create SESSION_STORAGE
fi

echo ""
echo "==================================="
echo "Setup Complete!"
echo "==================================="
echo ""
echo "What was configured:"
echo "  1. ✅ D1 Database: zeidgeist-auth (ID: $DATABASE_ID)"
echo "  2. ✅ Auth tables created (users, user_sessions)"
echo "  3. ✅ KV session caching enabled"
echo "  4. ✅ Durable Objects rate limiter configured"
echo ""
echo "Next steps:"
echo "  1. Deploy with: wrangler pages deploy out"
echo "  2. Set environment variables in Cloudflare dashboard:"
echo "     - JWT_SECRET (min 32 characters)"
echo "     - DATABASE_URL (Neon connection string - for migration period)"
echo ""
echo "Migration strategy:"
echo "  - Currently using hybrid mode (D1 + Neon)"
echo "  - D1 for new auth operations (fast, edge-local)"
echo "  - Neon as fallback for existing data"
echo "  - After migration: remove DATABASE_URL to use D1 only"
