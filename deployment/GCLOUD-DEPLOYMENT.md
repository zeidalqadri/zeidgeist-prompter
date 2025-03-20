# Deploying Zeidgeist Prompter to Google Cloud Run

This guide walks you through deploying the Zeidgeist Prompter application to Google Cloud Run. The deployment includes both the backend API and the Next.js frontend as a single integrated service.

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
2. [Docker](https://docs.docker.com/get-docker/) installed
3. Google Cloud account with billing enabled
4. A Google Cloud project created

## Setup Google Cloud CLI

1. Install the Google Cloud SDK if you haven't already:
   - Visit https://cloud.google.com/sdk/docs/install
   - Follow the installation instructions for your operating system

2. Initialize the Google Cloud SDK:
   ```
   gcloud init
   ```

3. Authenticate with Google Cloud:
   ```
   gcloud auth login
   ```

4. Set your project ID:
   ```
   gcloud config set project zeidgeistdotcom
   ```

## Enable Required APIs

Enable the necessary Google Cloud APIs:

```
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
```

## Project Structure

This deployment expects the following structure:
- API code in the root directory
- Next.js frontend code in the `zeidgeist-prompter` directory

The Docker build process:
1. Builds the Next.js frontend application
2. Copies the built frontend assets to be served by the Express backend
3. Creates a single container that serves both the frontend and API

## Deploy the Application

Run the deployment script:

```
./deploy-gcloud.sh
```

The script will:
1. Build a Docker image containing both the frontend and backend
2. Push the image to Google Container Registry
3. Deploy the image to Cloud Run
4. Output the URL where your service is available

## Environment Variables

To set environment variables for your application:

```
gcloud run services update zeidgeist-prompter \
  --update-env-vars DEEPSEEK_API_KEY=your_key,MISTRAL_API_KEY=your_key,USE_EXTERNAL_APIS=true \
  --region asia-southeast1
```

## Monitoring and Logs

View logs for your deployed service:

```
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zeidgeist-prompter" --limit 50
```

## Troubleshooting

1. **Build Failures**: Check the build logs for errors:
   ```
   gcloud builds list
   gcloud builds log BUILD_ID
   ```

2. **Deployment Failures**: Verify your service status:
   ```
   gcloud run services describe zeidgeist-prompter --region asia-southeast1
   ```

3. **Runtime Errors**: Check the application logs:
   ```
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zeidgeist-prompter" --limit 50
   ```

4. **Frontend Not Loading**: 
   - Verify the Next.js build is working correctly
   - Check for errors in the server logs related to serving the frontend
   - Ensure the file paths in `src/api.js` correctly point to the Next.js build output 