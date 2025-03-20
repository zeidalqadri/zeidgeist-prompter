# Zeidgeist Prompter Deployment

This document provides instructions for deploying the Zeidgeist Prompter application.

## Deployment Package

A deployment package has been created at `zeidgeist-production.tar.gz`. This package contains all the necessary files to run the application, including:

- Built Next.js application
- Package dependencies information
- Environment configuration
- Startup script

## EC2 Deployment

Detailed instructions for deploying to EC2 can be found in `docs/ec2-deployment-steps.md`. However, there are currently connectivity issues with the target EC2 instance at `ec2-3-94-159-172.compute-1.amazonaws.com`.

### Troubleshooting EC2 Connectivity

1. Verify the instance is running in AWS Console
2. Check security group settings to allow SSH traffic from your IP
3. Ensure network ACLs aren't blocking traffic
4. Verify the correct key pair is being used

## Alternative Deployment Options

If EC2 deployment is not possible, consider these alternatives:

### 1. Vercel Deployment (Recommended for Next.js)

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy from the project directory
cd zeidgeist-prompter
vercel
```

### 2. Netlify Deployment

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Deploy from the project directory
cd zeidgeist-prompter
netlify deploy
```

### 3. Manual Deployment to Any Server

Upload the `zeidgeist-production.tar.gz` file to your server and extract it:

```bash
# Create directory
mkdir -p zeidgeist-app

# Extract the application
tar -xzf zeidgeist-production.tar.gz -C zeidgeist-app

# Navigate to the application directory
cd zeidgeist-app

# Make the start script executable
chmod +x start.sh

# Run the application
./start.sh
```

## Environment Variables

The following environment variables need to be configured:

- `DEEPSEEK_API_KEY`: Your DeepSeek API key
- `MISTRAL_API_KEY`: Your Mistral API key
- `USE_EXTERNAL_APIS`: Set to `true` to use external APIs

## Support

For additional deployment assistance, refer to:
- Next.js deployment documentation: https://nextjs.org/docs/deployment
- AWS EC2 documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ 