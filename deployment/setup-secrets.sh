#!/bin/bash

# Script to set up secrets in Google Cloud Secret Manager
# Usage: ./setup-secrets.sh <project-id>

PROJECT_ID=${1:-"zeidgeistdotcom"}
REGION="asia-southeast1"

echo "Setting up secrets for project: $PROJECT_ID"

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com --project $PROJECT_ID

# Function to create or update a secret
create_or_update_secret() {
  local name=$1
  local value=$2
  
  # Check if secret already exists
  if gcloud secrets describe $name --project $PROJECT_ID &>/dev/null; then
    echo "Secret $name already exists. Updating version..."
    echo -n "$value" | gcloud secrets versions add $name --data-file=- --project $PROJECT_ID
  else
    echo "Creating new secret $name..."
    echo -n "$value" | gcloud secrets create $name --data-file=- --project $PROJECT_ID
  fi
  
  # Grant access to Cloud Build service account
  gcloud secrets add-iam-policy-binding $name \
    --member="serviceAccount:$PROJECT_ID@appspot.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project $PROJECT_ID
    
  # Also grant access to compute service account (used by Cloud Run)
  gcloud secrets add-iam-policy-binding $name \
    --member="serviceAccount:$PROJECT_ID-compute@developer.gserviceaccount.com" \
    --role="roles/secretmanager.secretAccessor" \
    --project $PROJECT_ID
}

# Prompt for API keys
read -p "Enter DeepSeek API Key: " DEEPSEEK_API_KEY
read -p "Enter Mistral API Key: " MISTRAL_API_KEY
read -p "Enter Claude API Key: " CLAUDE_API_KEY
read -p "Enter Gemini API Key: " GEMINI_API_KEY

# Create secrets
create_or_update_secret "deepseek-api-key" "$DEEPSEEK_API_KEY"
create_or_update_secret "mistral-api-key" "$MISTRAL_API_KEY"
create_or_update_secret "claude-api-key" "$CLAUDE_API_KEY"
create_or_update_secret "gemini-api-key" "$GEMINI_API_KEY"

echo "Secrets created/updated successfully"

# Update Cloud Build trigger to use secrets
TRIGGER_NAME="zeidgeist-prompter-deploy"

# Check if trigger exists
if gcloud builds triggers describe $TRIGGER_NAME --project $PROJECT_ID &>/dev/null; then
  echo "Updating Cloud Build trigger to use secrets..."
  gcloud builds triggers update $TRIGGER_NAME \
    --substitutions=_DEEPSEEK_API_KEY='$$DEEPSEEK_API_KEY',_MISTRAL_API_KEY='$$MISTRAL_API_KEY',_CLAUDE_API_KEY='$$CLAUDE_API_KEY',_GEMINI_API_KEY='$$GEMINI_API_KEY' \
    --project $PROJECT_ID
  
  echo "Setting up secret variables in Cloud Build trigger..."
  gcloud builds triggers update $TRIGGER_NAME \
    --add-secret="DEEPSEEK_API_KEY=projects/$PROJECT_ID/secrets/deepseek-api-key/versions/latest" \
    --add-secret="MISTRAL_API_KEY=projects/$PROJECT_ID/secrets/mistral-api-key/versions/latest" \
    --add-secret="CLAUDE_API_KEY=projects/$PROJECT_ID/secrets/claude-api-key/versions/latest" \
    --add-secret="GEMINI_API_KEY=projects/$PROJECT_ID/secrets/gemini-api-key/versions/latest" \
    --project $PROJECT_ID
else
  echo "Cloud Build trigger $TRIGGER_NAME not found. Please create it manually."
  echo "Then run the following command to update it:"
  echo "gcloud builds triggers update $TRIGGER_NAME --substitutions=_DEEPSEEK_API_KEY='$$DEEPSEEK_API_KEY',_MISTRAL_API_KEY='$$MISTRAL_API_KEY',_CLAUDE_API_KEY='$$CLAUDE_API_KEY',_GEMINI_API_KEY='$$GEMINI_API_KEY' --project $PROJECT_ID"
  echo "gcloud builds triggers update $TRIGGER_NAME --add-secret=\"DEEPSEEK_API_KEY=projects/$PROJECT_ID/secrets/deepseek-api-key/versions/latest\" --add-secret=\"MISTRAL_API_KEY=projects/$PROJECT_ID/secrets/mistral-api-key/versions/latest\" --add-secret=\"CLAUDE_API_KEY=projects/$PROJECT_ID/secrets/claude-api-key/versions/latest\" --add-secret=\"GEMINI_API_KEY=projects/$PROJECT_ID/secrets/gemini-api-key/versions/latest\" --project $PROJECT_ID"
fi

echo "Setup complete. Now you can run a manual build or push to trigger the deployment." 