#!/bin/bash
set -e

# Kill any processes using ports 3333 and 8084 if they exist
echo "Checking for existing processes on ports 3333 and 8084..."
lsof -i :3333 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
lsof -i :8084 | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true

# Define environment variables for the ports
export PORT=8084
export NEXT_PORT=3333

# Start the Next.js development server
echo "Starting Next.js development server on port $NEXT_PORT..."
cd frontend
PORT=$NEXT_PORT npm run dev &
FRONTEND_PID=$!
cd ..

# Wait a moment for Next.js to start
echo "Waiting for Next.js server to start..."
sleep 5

# Start the API server
echo "Starting API server on port $PORT..."
node src/api.js &
API_PID=$!

# Function to handle script termination
cleanup() {
  echo "Shutting down servers..."
  kill $FRONTEND_PID $API_PID 2>/dev/null || true
}

# Set up trap for clean shutdown
trap cleanup EXIT INT TERM

# Keep the script running
echo "Both servers running. Press Ctrl+C to stop."
wait