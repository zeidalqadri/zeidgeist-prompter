#!/bin/bash

# Cloudflare Pages build script
echo "🚀 Starting Zeidgeist Prompter build..."

# Remove SaaS monorepo before build — it has its own deps/lockfile
# that conflict with the main app's Cloudflare Pages build
rm -rf mstprmpt-saas/

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Generate database migrations (don't run them, just generate)
echo "🗄️ Generating database migrations..."
npm run db:generate

# Build the Next.js application
echo "🏗️ Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"