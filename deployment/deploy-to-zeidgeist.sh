#!/bin/bash
set -e

# Configuration
PROJECT_ID="zeidgeistdotcom"
SERVICE_NAME="zeidgeist-prompter"
REGION="asia-southeast1"
BASE_URL="/prompter"
DOMAIN="zeidgeist.com"

echo "===== Deploying Zeidgeist Prompter to Google Cloud Run ====="
echo "This will deploy the application to be accessible at $DOMAIN$BASE_URL"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "Error: Google Cloud SDK (gcloud) is not installed or not in your PATH."
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Ensure user is logged in to gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "You are not logged in to Google Cloud SDK. Please login first:"
    gcloud auth login
fi

# Set the project
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "Enabling required Google Cloud APIs..."
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Update the Dockerfile for our specific project structure
echo "Updating Dockerfile for current project structure..."
cat > deployment/Dockerfile.new << 'EOL'
FROM node:18-slim AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend-new/package*.json ./frontend-new/
COPY backend/package*.json ./backend/

# Install dependencies at root level
RUN npm ci

# Build the Next.js frontend
WORKDIR /app/frontend-new
RUN npm run build

# Now create the production image
FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install production dependencies
RUN npm ci --only=production

# Copy backend code
COPY backend/ ./backend/

# Copy the built frontend
COPY --from=builder /app/frontend-new/.next/standalone/ ./frontend-new/
COPY --from=builder /app/frontend-new/.next/static/ ./frontend-new/.next/static/
COPY --from=builder /app/frontend-new/public/ ./frontend-new/public/

# Create .env file with API keys
COPY .env ./

# Add the base path configuration
RUN echo "BASE_PATH=$BASE_URL" >> .env

# Expose the port the app will run on
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start the application
CMD ["node", "backend/src/api.js"]
EOL

# Replace the old Dockerfile
mv deployment/Dockerfile.new deployment/Dockerfile

# Create a simple next.config.js that supports the /prompter base path
echo "Configuring Next.js for the /prompter base path..."
cat > frontend-new/next.config.js << EOL
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  basePath: process.env.BASE_PATH || '/prompter',
  assetPrefix: process.env.BASE_PATH || '/prompter',
}

module.exports = nextConfig
EOL

# Modify the Express server to serve the frontend from the /prompter path
echo "Updating backend API to serve frontend from $BASE_URL path..."
BACKEND_API_FILE="backend/src/api.js"
if [ -f "$BACKEND_API_FILE" ]; then
    # Add basePath support to the Express server
    sed -i.bak '/const app = express/a const basePath = process.env.BASE_PATH || "/prompter";' $BACKEND_API_FILE
    sed -i.bak 's|app.use("/", createProxyMiddleware|app.use(basePath, createProxyMiddleware|g' $BACKEND_API_FILE
    sed -i.bak 's|app.use("/api/|app.use(basePath + "/api/|g' $BACKEND_API_FILE
    rm -f "${BACKEND_API_FILE}.bak"
fi

# Build the Docker image
echo "Building Docker image..."
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
  --min-instances 1 \
  --set-env-vars "BASE_PATH=$BASE_URL" \
  --set-env-vars-from-file .env

# Get the Cloud Run URL
CLOUD_RUN_URL=$(gcloud run services describe $SERVICE_NAME --platform managed --region $REGION --format 'value(status.url)')

echo "===== Deployment Complete ====="
echo "Cloud Run URL: $CLOUD_RUN_URL"
echo "Now you need to configure your domain $DOMAIN to route $BASE_URL to this Cloud Run service."
echo ""
echo "To set up domain mapping:"
echo "1. Verify domain ownership: https://cloud.google.com/run/docs/mapping-custom-domains#verify_domain_ownership"
echo "2. Map the domain: gcloud beta run domain-mappings create --service=$SERVICE_NAME --region=$REGION --domain=$DOMAIN"
echo "3. Configure your DNS to add a CNAME record for the $BASE_URL subdirectory pointing to the provided URL"

# Set appropriate permissions
chmod +x deployment/deploy-to-zeidgeist.sh 