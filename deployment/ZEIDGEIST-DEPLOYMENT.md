# Deploying to zeidgeist.com/prompter

This guide provides instructions for deploying the Zeidgeist Prompter application to Google Cloud Run and making it accessible at the URL path `zeidgeist.com/prompter`.

## Prerequisites

1. [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) installed
2. [Docker](https://docs.docker.com/get-docker/) installed
3. Google Cloud account with billing enabled
4. Access to the domain zeidgeist.com DNS settings
5. A Google Cloud project (using "zeidgeistdotcom" in these instructions)

## Deployment Steps

### 1. Prepare Your Environment

Make sure you have the necessary API keys in your `.env` file in the root directory:

```
DEEPSEEK_API_KEY=your_deepseek_api_key
MISTRAL_API_KEY=your_mistral_api_key
GEMINI_API_KEY=your_gemini_api_key
CLAUDE_API_KEY=your_claude_api_key
USE_EXTERNAL_APIS=true
MONGODB_URI=mongodb://localhost:27017/promptEnhancer
```

### 2. Run the Deployment Script

```bash
chmod +x deployment/deploy-to-zeidgeist.sh
./deployment/deploy-to-zeidgeist.sh
```

This script will:
- Verify your Google Cloud SDK installation and authentication
- Enable required Google Cloud APIs
- Create an updated Dockerfile for our project structure
- Configure Next.js and the Express server for the `/prompter` base path
- Build and deploy the application to Google Cloud Run
- Provide further instructions for domain configuration

### 3. Configure Domain Mapping

After the deployment script completes successfully, you'll need to set up domain mapping to make your application accessible at `zeidgeist.com/prompter`:

1. Verify domain ownership in Google Cloud (if not already done)
2. Map the domain to your Cloud Run service
3. Configure your DNS settings with your domain provider

#### Verifying Domain Ownership

```bash
gcloud domains verify zeidgeist.com
```

Follow the instructions to add a TXT record to your domain's DNS settings.

#### Create Domain Mapping

```bash
gcloud beta run domain-mappings create --service=zeidgeist-prompter --region=asia-southeast1 --domain=zeidgeist.com
```

#### Configure DNS Settings

Add or update the DNS records according to the instructions provided by Google Cloud after creating the domain mapping. Typically, this involves adding a CNAME record.

### 4. Testing Your Deployment

Once DNS has propagated (which can take 24-48 hours), your application should be accessible at:

```
https://zeidgeist.com/prompter
```

## Troubleshooting

### Checking Deployment Status

```bash
gcloud run services describe zeidgeist-prompter --region=asia-southeast1
```

### Viewing Logs

```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zeidgeist-prompter" --limit 50
```

### Common Issues

1. **Domain mapping issues**: Ensure your DNS records are correctly configured
2. **API key issues**: Verify that your environment variables are correctly set
3. **Base path problems**: Check that both Next.js and Express are correctly configured to use the `/prompter` base path

## Updating the Deployment

To update your deployment after making changes:

```bash
./deployment/deploy-to-zeidgeist.sh
```

The script handles rebuilding and redeploying the application with your changes. 