#!/bin/bash
set -e

# Configuration
PROJECT_ID="zeidgeistdotcom"
SERVICE_NAME="zeidgeist-prompter"
REGION="asia-southeast1"

# Check if frontend app directory exists
if [ ! -d "frontend/app" ]; then
  echo "Error: frontend/app directory not found."
  exit 1
fi

echo "Building and deploying Zeidgeist Prompter..."

# Authenticate with Google Cloud (if needed)
echo "Authenticating with Google Cloud..."
if ! gcloud auth print-access-token &>/dev/null; then
  gcloud auth login
fi

# Ensure we're using the right project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required services
echo "Enabling required services..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com

# Read API keys from .env file or set to placeholder if not found
if [ -f ".env" ]; then
  source <(grep -v '^#' .env | sed -E 's/(.*)=(.*)/\1="\2"/')
fi

# Set default placeholder values if not already set
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-"placeholder"}
MISTRAL_API_KEY=${MISTRAL_API_KEY:-"placeholder"}
CLAUDE_API_KEY=${CLAUDE_API_KEY:-"placeholder"}
GEMINI_API_KEY=${GEMINI_API_KEY:-"placeholder"}

# Submit to Cloud Build with substitutions
echo "Submitting to Cloud Build with substitutions..."
gcloud builds submit --config=cloudbuild.yaml \
  --substitutions=_DEEPSEEK_API_KEY="$DEEPSEEK_API_KEY",_MISTRAL_API_KEY="$MISTRAL_API_KEY",_CLAUDE_API_KEY="$CLAUDE_API_KEY",_GEMINI_API_KEY="$GEMINI_API_KEY",_MONGODB_URI="mongodb+srv://zeidalqadri:${MONGODB_PASSWORD:-password123}@zeidgeist-cluster.vuiut.mongodb.net/promptEnhancer?retryWrites=true&w=majority"

echo "Deployment complete!"
echo "Your service should be available at:"
gcloud run services describe $SERVICE_NAME --region $REGION --format 'value(status.url)' 