#!/bin/bash

# Script to manually deploy the application with API keys
# Usage: ./deploy-with-keys.sh <deepseek-key> <mistral-key> <claude-key> <gemini-key>

# Check for required arguments
if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <deepseek-key> <mistral-key> <claude-key> <gemini-key>"
  exit 1
fi

DEEPSEEK_API_KEY=$1
MISTRAL_API_KEY=$2
CLAUDE_API_KEY=$3
GEMINI_API_KEY=$4
PROJECT_ID="zeidgeistdotcom"
REGION="asia-southeast1"
SERVICE="zeidgeist-prompter"

echo "Deploying to Cloud Run with API keys..."

# Build the container
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY",_MISTRAL_API_KEY="$MISTRAL_API_KEY",_CLAUDE_API_KEY="$CLAUDE_API_KEY",_GEMINI_API_KEY="$GEMINI_API_KEY" \
  --project $PROJECT_ID

echo "Deployment complete. Checking service status..."
gcloud run services describe $SERVICE --region $REGION --project $PROJECT_ID

echo "Service URL: https://$SERVICE-$PROJECT_ID.a.run.app" 