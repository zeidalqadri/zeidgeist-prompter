#!/bin/bash
set -e

# Configuration
PROJECT_ID="zeidgeistdotcom"
SERVICE_NAME="zeidgeist-prompter"
REGION="asia-southeast1"

# Verify Next.js app directory exists
if [ ! -d "../frontend" ]; then
  echo "Error: frontend directory not found. Make sure the Next.js app is in the correct location."
  exit 1
fi

# Build the Docker image
echo "Building Docker image with frontend and backend integration..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
echo "Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1

echo "Deployment complete! Your service is now available at:"
gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)' 