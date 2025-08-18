#!/bin/bash
# Cloudflare Pages build script wrapper
# Ensures frontend builds with correct working directory

echo "Starting Cloudflare Pages build..."
echo "Current directory: $(pwd)"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

# Change to frontend directory and build
cd frontend || {
    echo "Error: frontend directory not found"
    exit 1
}

echo "Changed to frontend directory: $(pwd)"
echo "Running Next.js build..."

# Run the build
npm run build

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo "Build completed successfully!"
    echo "Build output directory: $(pwd)/.next"
    ls -la .next/
else
    echo "Build failed!"
    exit 1
fi