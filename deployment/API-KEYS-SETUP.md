# Setting Up API Keys for Zeidgeist Prompter

This document provides instructions for setting up the required API keys for the Zeidgeist Prompter application.

## Required API Keys

Zeidgeist Prompter requires the following API keys to function properly:

1. **DeepSeek API Key** - For DeepSeek LLM services
2. **Mistral API Key** - For Mistral AI LLM services 
3. **Claude API Key** - For Anthropic's Claude LLM services
4. **Gemini API Key** - For Google's Gemini LLM services

## Option 1: Using Secret Manager (Recommended)

Google Cloud Secret Manager is the recommended way to store and manage API keys securely.

### Setup Instructions

1. Run the provided setup script:
   ```bash
   ./deployment/setup-secrets.sh
   ```

2. Enter your API keys when prompted.

3. The script will:
   - Create secrets in Google Cloud Secret Manager
   - Grant necessary permissions
   - Update the Cloud Build trigger to use these secrets

4. Deploy your application using Cloud Build:
   ```bash
   gcloud builds submit --config cloudbuild.yaml
   ```

## Option 2: Deploying With Existing .env File

If you already have API keys in your local `.env` file, you can deploy directly using those keys:

1. Make sure your `.env` file contains the following keys:
   ```
   DEEPSEEK_API_KEY=your_deepseek_key
   MISTRAL_API_KEY=your_mistral_key
   CLAUDE_API_KEY=your_claude_key
   GEMINI_API_KEY=your_gemini_key
   ```

2. Run the deployment script:
   ```bash
   ./deployment/deploy-with-env.sh
   ```

3. This will read the API keys from your `.env` file and use them in the deployment process.

## Option 3: Direct Manual Deployment with Keys

For quick testing or one-time deployments, you can directly provide the API keys:

1. Use the provided deployment script:
   ```bash
   ./deployment/deploy-with-keys.sh "your-deepseek-key" "your-mistral-key" "your-claude-key" "your-gemini-key"
   ```

2. This will deploy the application with the provided API keys.

## Option 4: Updating API Keys on Existing Deployment

To update API keys on an already deployed service without rebuilding the container:

1. Run the update script and enter your API keys when prompted:
   ```bash
   ./deployment/update-api-keys.sh
   ```

2. Or use your existing `.env` file:
   ```bash
   ./deployment/update-api-keys.sh --from-env
   ```

3. This will update the environment variables on your Cloud Run service immediately.

## Obtaining API Keys

### DeepSeek API Key
1. Visit [DeepSeek Platform](https://platform.deepseek.com/)
2. Create an account and navigate to the API section
3. Generate a new API key

### Mistral API Key
1. Visit [Mistral AI](https://mistral.ai/)
2. Sign up for API access
3. Generate a new API key from your dashboard

### Claude API Key
1. Visit [Anthropic](https://www.anthropic.com/product)
2. Sign up for Claude API access
3. Generate an API key from your account settings

### Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create or sign in to your Google account
3. Generate a new API key for Gemini

## Verifying API Keys Are Configured

After deployment, you can verify that the API keys are properly configured by:

1. Accessing the status endpoint:
   ```
   https://zeidgeist-prompter-665365059532.asia-southeast1.run.app/prompter/api/status
   ```

2. Check the logs for messages indicating that the LLMs are properly configured:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=zeidgeist-prompter" --limit 20
   ```

## Troubleshooting

If the application shows that LLM services are missing:

1. Verify that you have set the correct API keys
2. Check that the environment variables are being properly passed to the container
3. Review the Cloud Run logs for any error messages related to API authentication
4. Ensure that the `USE_EXTERNAL_APIS` environment variable is set to `true` 