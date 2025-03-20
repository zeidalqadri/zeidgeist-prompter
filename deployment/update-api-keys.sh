#!/bin/bash

# Script to update API keys directly on a Cloud Run service without rebuilding
# Usage: ./update-api-keys.sh [--from-env]

PROJECT_ID="zeidgeistdotcom"
REGION="asia-southeast1"
SERVICE="zeidgeist-prompter"

# Check if we should read from .env file
if [ "$1" = "--from-env" ]; then
  if [ -f ".env" ]; then
    echo "Loading API keys from .env file..."
    export $(grep -v '^#' .env | xargs)
    
    # Check if required variables are set
    if [ -z "$DEEPSEEK_API_KEY" ] || [ -z "$MISTRAL_API_KEY" ] || [ -z "$CLAUDE_API_KEY" ] || [ -z "$GEMINI_API_KEY" ]; then
      echo "Error: One or more required API keys are missing in .env file."
      echo "Required keys: DEEPSEEK_API_KEY, MISTRAL_API_KEY, CLAUDE_API_KEY, GEMINI_API_KEY"
      exit 1
    fi
  else
    echo "Error: .env file not found in the current directory."
    exit 1
  fi
else
  # Prompt for API keys
  read -p "Enter DeepSeek API Key: " DEEPSEEK_API_KEY
  read -p "Enter Mistral API Key: " MISTRAL_API_KEY
  read -p "Enter Claude API Key: " CLAUDE_API_KEY
  read -p "Enter Gemini API Key: " GEMINI_API_KEY
fi

echo "Updating API keys on Cloud Run service $SERVICE..."

# Get current environment variables
CURRENT_ENV=$(gcloud run services describe $SERVICE --region $REGION --project $PROJECT_ID --format="value(spec.template.spec.containers[0].env)")

# Parse MongoDB URI from current env vars (if it exists)
MONGODB_URI=$(echo "$CURRENT_ENV" | grep -o 'MONGODB_URI=[^,]*' | cut -d'=' -f2 || echo "mongodb+srv://zeidalqadri:password123@zeidgeist-cluster.vuiut.mongodb.net/?retryWrites=true&w=majority&appName=zeidgeist-cluster")

# Update only the environment variables
gcloud run services update $SERVICE \
  --region $REGION \
  --project $PROJECT_ID \
  --set-env-vars="USE_EXTERNAL_APIS=true,MONGODB_URI=$MONGODB_URI,DEEPSEEK_API_KEY=$DEEPSEEK_API_KEY,MISTRAL_API_KEY=$MISTRAL_API_KEY,CLAUDE_API_KEY=$CLAUDE_API_KEY,GEMINI_API_KEY=$GEMINI_API_KEY"

echo "API keys updated successfully!"
echo "Service URL: https://$SERVICE-665365059532.$REGION.run.app"
echo "You may need to wait a few seconds for the changes to take effect."
echo "Check the service logs to verify the API keys are working:"
echo "gcloud logging read \"resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE\" --limit 20" 