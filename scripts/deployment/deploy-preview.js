#!/usr/bin/env node

/**
 * Preview deployment script for pull requests
 * Handles preview-specific environment configuration and deployment
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

class PreviewDeployment {
  constructor() {
    this.prNumber = process.env.PR_NUMBER;
    this.commitSha = process.env.GITHUB_SHA;
    this.branch = process.env.GITHUB_HEAD_REF;
    this.environment = 'preview';
    
    if (!this.prNumber) {
      throw new Error('PR_NUMBER environment variable is required');
    }
  }

  async validatePreviewEnvironment() {
    console.log('🔍 Validating preview environment variables...');
    
    const requiredVars = [
      'DATABASE_URL',
      'JWT_SECRET',
      'NEXTAUTH_SECRET',
      'PR_NUMBER'
    ];
    
    const missing = requiredVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Check if at least one API key is configured
    const apiKeys = [
      'CLAUDE_API_KEY',
      'OPENAI_API_KEY', 
      'MISTRAL_API_KEY'
    ];
    
    const configuredApis = apiKeys.filter(key => process.env[key]);
    
    if (configuredApis.length === 0) {
      console.warn('⚠️  No external API keys configured for preview. Limited functionality available.');
    } else {
      console.log(`✅ Found ${configuredApis.length} configured API key(s) for preview`);
    }
    
    console.log('✅ Preview environment validation passed');
  }

  async generatePreviewConfig() {
    console.log('📋 Generating preview deployment configuration...');
    
    const previewConfig = {
      environment: 'preview',
      prNumber: this.prNumber,
      commitSha: this.commitSha,
      branch: this.branch,
      deploymentUrl: `https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev`,
      timestamp: new Date().toISOString(),
      features: {
        database: 'staging', // Uses staging database
        authentication: true,
        externalAPIs: !!process.env.CLAUDE_API_KEY || !!process.env.OPENAI_API_KEY,
        monitoring: false, // Minimal monitoring for previews
        analytics: false   // No analytics in preview
      },
      security: {
        cors: 'permissive', // More permissive CORS for testing
        rateLimit: 'relaxed', // Relaxed rate limiting
        logging: 'verbose'  // Verbose logging for debugging
      }
    };
    
    // Ensure dist directory exists
    if (!fs.existsSync('dist')) {
      fs.mkdirSync('dist', { recursive: true });
    }
    
    // Write preview config
    fs.writeFileSync(
      path.join('dist', 'preview-config.json'),
      JSON.stringify(previewConfig, null, 2)
    );
    
    // Generate environment-specific settings
    const envFile = `
# Preview Environment Variables
NODE_ENV=preview
APP_ENV=preview
NEXT_PUBLIC_APP_ENV=preview
NEXT_PUBLIC_API_URL=https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev
NEXT_PUBLIC_ENVIRONMENT=preview
NEXT_PUBLIC_FEATURE_FLAGS={"preview_mode":true,"debug_tools":true}
`.trim();
    
    fs.writeFileSync('.env.preview', envFile);
    
    console.log('✅ Preview configuration generated');
    console.log(`   PR Number: ${this.prNumber}`);
    console.log(`   Branch: ${this.branch}`);
    console.log(`   Deployment URL: ${previewConfig.deploymentUrl}`);
    
    return previewConfig;
  }

  async buildForPreview() {
    console.log('🏗️  Building application for preview environment...');
    
    try {
      // Set preview-specific build environment
      const buildEnv = {
        ...process.env,
        NODE_ENV: 'preview',
        APP_ENV: 'preview',
        NEXT_PUBLIC_APP_ENV: 'preview',
        NEXT_PUBLIC_API_URL: `https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev`,
        NEXT_PUBLIC_ENVIRONMENT: 'preview',
        NEXT_PUBLIC_FEATURE_FLAGS: JSON.stringify({
          preview_mode: true,
          debug_tools: true,
          experimental_features: true
        })
      };
      
      await execAsync('npm run build', { env: buildEnv });
      
      // Verify preview build
      this.validatePreviewBuild();
      
      console.log('✅ Preview build completed successfully');
      
    } catch (error) {
      console.error('❌ Preview build failed:', error.message);
      throw error;
    }
  }

  validatePreviewBuild() {
    console.log('🔍 Validating preview build output...');
    
    const distPath = path.join(process.cwd(), 'dist');
    const requiredFiles = [
      'index.html',
      'preview-config.json'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required preview build file: ${file}`);
      }
    }
    
    // Check that preview config is correct
    const previewConfig = JSON.parse(
      fs.readFileSync(path.join(distPath, 'preview-config.json'), 'utf8')
    );
    
    if (previewConfig.prNumber !== this.prNumber) {
      throw new Error('Preview configuration PR number mismatch');
    }
    
    console.log('✅ Preview build validation passed');
  }

  async runPreviewTests() {
    console.log('🧪 Running preview-specific tests...');
    
    try {
      // Run lightweight tests for preview
      await execAsync('npm run test:unit -- --run --reporter=basic');
      console.log('✅ Preview unit tests passed');
      
      // Skip integration tests in preview for speed
      console.log('⏭️  Skipping integration tests for preview deployment');
      
    } catch (error) {
      console.error('❌ Preview tests failed:', error.message);
      // Don't fail deployment for test failures in preview
      console.warn('⚠️  Continuing with deployment despite test failures');
    }
  }

  async deployToCloudflare() {
    console.log(`🚀 Deploying preview to Cloudflare Pages...`);
    
    try {
      const deployCmd = `wrangler pages deploy dist --project-name=zeidgeist-prompter --branch=preview-pr-${this.prNumber} --compatibility-date=2024-01-15`;
      
      const { stdout } = await execAsync(deployCmd, {
        env: {
          ...process.env,
          CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN
        }
      });
      
      console.log('✅ Preview deployment completed');
      
      // Extract deployment URL from output
      const urlMatch = stdout.match(/https:\/\/[^\s]+/);
      const deploymentUrl = urlMatch ? urlMatch[0] : `https://preview-pr-${this.prNumber}.zeidgeist-prompter.pages.dev`;
      
      return deploymentUrl;
      
    } catch (error) {
      console.error('❌ Preview deployment failed:', error.message);
      throw error;
    }
  }

  async waitForDeployment(url) {
    console.log(`⏳ Waiting for preview deployment to be available...`);
    
    const maxAttempts = 30;
    let attempt = 1;
    
    while (attempt <= maxAttempts) {
      try {
        const { stdout } = await execAsync(`curl -f --max-time 30 "${url}/api/health/liveness"`, {
          stdio: ['ignore', 'pipe', 'ignore']
        });
        
        console.log('✅ Preview deployment is live and healthy!');
        return true;
        
      } catch (error) {
        if (attempt === maxAttempts) {
          throw new Error(`Preview deployment health check failed after ${maxAttempts} attempts`);
        }
        
        console.log(`⏳ Attempt ${attempt}/${maxAttempts}: Deployment not ready yet, waiting...`);
        await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        attempt++;
      }
    }
  }

  async generateDeploymentSummary(deploymentUrl) {
    console.log('📊 Generating preview deployment summary...');
    
    const summary = {
      success: true,
      environment: 'preview',
      prNumber: this.prNumber,
      branch: this.branch,
      commit: this.commitSha,
      deploymentUrl,
      timestamp: new Date().toISOString(),
      features: [
        'Preview environment configuration',
        'Staging database connection',
        'Relaxed security settings',
        'Debug tools enabled',
        'Experimental features enabled'
      ],
      testingGuidelines: [
        'Test core functionality',
        'Verify UI/UX changes',
        'Check console for errors',
        'Validate performance',
        'Test security features'
      ],
      limitations: [
        'Uses staging database',
        'No production monitoring',
        'Relaxed rate limiting',
        'No analytics tracking'
      ]
    };
    
    fs.writeFileSync(
      'preview-deployment-summary.json',
      JSON.stringify(summary, null, 2)
    );
    
    console.log('✅ Preview deployment summary generated');
    console.log(`\n🎉 Preview deployment successful!`);
    console.log(`📱 Preview URL: ${deploymentUrl}`);
    console.log(`🔗 Direct access: ${deploymentUrl}`);
    console.log(`🔍 Health check: ${deploymentUrl}/api/health`);
    
    return summary;
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting preview deployment...\n');
    
    const deployment = new PreviewDeployment();
    
    // Validation and preparation
    await deployment.validatePreviewEnvironment();
    const config = await deployment.generatePreviewConfig();
    
    // Build and test
    await deployment.buildForPreview();
    await deployment.runPreviewTests();
    
    // Deploy to Cloudflare
    const deploymentUrl = await deployment.deployToCloudflare();
    await deployment.waitForDeployment(deploymentUrl);
    
    // Generate summary
    await deployment.generateDeploymentSummary(deploymentUrl);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Preview deployment completed in ${duration}s`);
    console.log('🎯 Ready for testing and review!');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Preview deployment failed after ${duration}s`);
    console.error(`   Error: ${error.message}`);
    console.error('   Please check the logs and try again.');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PreviewDeployment;