#!/bin/bash
set -e

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
  echo "Node.js is required but not installed. Please install Node.js first."
  exit 1
fi

# Check project structure
if [ ! -d "zeidgeist-prompter" ]; then
  echo "Error: zeidgeist-prompter directory not found. Make sure the Next.js app is in the correct location."
  exit 1
fi

if [ ! -d "src" ]; then
  echo "Error: src directory not found. Make sure the API code is in the correct location."
  exit 1
fi

# Install API dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing API dependencies..."
  npm install
fi

# Install frontend dependencies if needed
if [ ! -d "zeidgeist-prompter/node_modules" ]; then
  echo "Installing frontend dependencies..."
  cd zeidgeist-prompter
  npm install
  cd ..
fi

# Start the Next.js development server
echo "Starting Next.js development server..."
cd zeidgeist-prompter
npm run dev &
cd ..

# Wait a moment for Next.js to start
sleep 3

# Start the API server
echo "Starting API server on http://localhost:8080"
node src/api.js 