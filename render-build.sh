#!/bin/bash
set -e

# Debug information
echo "Starting Render build script"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"

# Install root dependencies
echo "Installing root dependencies..."
npm install

# Install and build frontend
echo "Installing frontend dependencies..."
cd frontend
npm install
echo "Building frontend..."
npm run build
cd ..

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

# Validate the setup
echo "Validating environment..."
node backend/scripts/deployment-validate.js

echo "Build completed successfully!"
