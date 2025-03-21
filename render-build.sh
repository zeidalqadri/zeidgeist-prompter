#!/bin/bash
set -e

# Debug information
echo "Starting Render build script"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Make sure script is executable
chmod +x render-build.sh

# Clear node_modules to avoid any caching issues
echo "Cleaning previous installations..."
rm -rf node_modules
rm -rf frontend/node_modules
rm -rf backend/node_modules

# Clear npm cache to ensure clean installation
echo "Clearing npm cache..."
npm cache clean --force

# Install root dependencies
echo "Installing root dependencies..."
npm ci --no-audit --no-fund || npm install --no-audit --no-fund

# Install and build frontend
echo "Installing frontend dependencies..."
cd frontend
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
echo "Building frontend..."
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
cd ..

# Validate the setup
echo "Validating environment..."
node backend/scripts/deployment-validate.js

echo "Build completed successfully!"
