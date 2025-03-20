#!/bin/bash

# Script to deploy using API keys from .env file
# Usage: ./deploy-with-env.sh

# Load environment variables from .env file
if [ -f ".env" ]; then
  echo "Loading API keys from .env file..."
  export $(grep -v '^#' .env | xargs)
else
  echo "Error: .env file not found in the current directory."
  exit 1
fi

# Check if required variables are set
if [ -z "$DEEPSEEK_API_KEY" ] || [ -z "$MISTRAL_API_KEY" ] || [ -z "$CLAUDE_API_KEY" ] || [ -z "$GEMINI_API_KEY" ]; then
  echo "Error: One or more required API keys are missing in .env file."
  echo "Required keys: DEEPSEEK_API_KEY, MISTRAL_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY"
  exit 1
fi

PROJECT_ID="zeidgeistdotcom"
REGION="asia-southeast1"
SERVICE="zeidgeist-prompter"

echo "Deploying to Cloud Run with API keys from .env file..."

# Build the container with substitutions from .env file
gcloud builds submit \
  --config cloudbuild.yaml \
  --substitutions=_DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY",_MISTRAL_API_KEY="$MISTRAL_API_KEY",_CLAUDE_API_KEY="$CLAUDE_API_KEY",_GEMINI_API_KEY="$GEMINI_API_KEY" \
  --project $PROJECT_ID

echo "Deployment complete. Checking service status..."
gcloud run services describe $SERVICE --region $REGION --project $PROJECT_ID

echo "Service URL: https://$SERVICE-665365059532.$REGION.run.app" 