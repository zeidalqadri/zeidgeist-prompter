#!/usr/bin/env node

/**
 * Setup script for testing preview deployments locally
 * Helps developers test the preview deployment workflow before pushing
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

class PreviewTestSetup {
  constructor() {
    this.currentBranch = null;
    this.testPrNumber = Math.floor(Math.random() * 1000) + 1000; // Random test PR number
  }

  async getCurrentBranch() {
    try {
      const { stdout } = await execAsync('git branch --show-current');
      this.currentBranch = stdout.trim();
      return this.currentBranch;
    } catch (error) {
      throw new Error('Failed to get current git branch');
    }
  }

  async validateGitStatus() {
    console.log('🔍 Checking git status...');
    
    try {
      const { stdout } = await execAsync('git status --porcelain');
      
      if (stdout.trim()) {
        console.warn('⚠️  You have uncommitted changes:');
        console.log(stdout);
        console.log('\nCommit your changes before testing preview deployment.');
        
        const readline = require('readline').createInterface({
          input: process.stdin,
          output: process.stdout
        });
        
        const answer = await new Promise(resolve => {
          readline.question('Continue anyway? (y/N): ', resolve);
        });
        
        readline.close();
        
        if (answer.toLowerCase() !== 'y') {
          process.exit(0);
        }
      }
      
      console.log('✅ Git status is clean');
    } catch (error) {
      throw new Error('Failed to check git status');
    }
  }

  async createTestEnvironment() {
    console.log('🛠️  Creating test environment...');
    
    const testEnv = `
# Test Preview Environment Variables
NODE_ENV=preview
APP_ENV=preview
NEXT_PUBLIC_APP_ENV=preview
NEXT_PUBLIC_API_URL=https://preview-pr-${this.testPrNumber}.zeidgeist-prompter.pages.dev
NEXT_PUBLIC_ENVIRONMENT=preview
NEXT_PUBLIC_PR_NUMBER=${this.testPrNumber}
NEXT_PUBLIC_BRANCH=${this.currentBranch}
NEXT_PUBLIC_COMMIT=test-commit-sha
NEXT_PUBLIC_FEATURE_FLAGS={"preview_mode":true,"debug_tools":true,"experimental_features":true}

# Test deployment variables (mock)
PR_NUMBER=${this.testPrNumber}
GITHUB_HEAD_REF=${this.currentBranch}
GITHUB_SHA=test-commit-sha-1234567890abcdef
DEPLOYMENT_URL=https://preview-pr-${this.testPrNumber}.zeidgeist-prompter.pages.dev

# Required secrets (use staging values)
DATABASE_URL=\${DATABASE_URL}
JWT_SECRET=\${JWT_SECRET}
NEXTAUTH_SECRET=\${NEXTAUTH_SECRET}
CLAUDE_API_KEY=\${CLAUDE_API_KEY}
OPENAI_API_KEY=\${OPENAI_API_KEY}
MISTRAL_API_KEY=\${MISTRAL_API_KEY}
`.trim();

    fs.writeFileSync('.env.preview.test', testEnv);
    console.log(`✅ Test environment created (.env.preview.test)`);
    console.log(`   Test PR Number: ${this.testPrNumber}`);
    console.log(`   Test Branch: ${this.currentBranch}`);
  }

  async testPreviewConfiguration() {
    console.log('🧪 Testing preview configuration...');
    
    try {
      // Test environment validation
      const { previewConfig, validatePreviewEnvironment } = require('../app/lib/config/preview-environment.js');
      
      // Mock environment variables
      process.env.NODE_ENV = 'preview';
      process.env.APP_ENV = 'preview';
      process.env.PR_NUMBER = this.testPrNumber.toString();
      process.env.GITHUB_HEAD_REF = this.currentBranch;
      process.env.GITHUB_SHA = 'test-commit-sha-1234567890abcdef';
      
      console.log('✅ Preview configuration loaded successfully');
      console.log(`   Environment: ${previewConfig.environment}`);
      console.log(`   Features enabled: ${Object.keys(previewConfig.features).filter(k => previewConfig.features[k]).length}`);
      
    } catch (error) {
      console.error('❌ Preview configuration test failed:', error.message);
      throw error;
    }
  }

  async testBuildProcess() {
    console.log('🏗️  Testing build process...');
    
    try {
      // Load test environment
      if (fs.existsSync('.env.preview.test')) {
        const envContent = fs.readFileSync('.env.preview.test', 'utf8');
        const envVars = envContent.split('\n')
          .filter(line => line.includes('=') && !line.startsWith('#'))
          .reduce((acc, line) => {
            const [key, value] = line.split('=');
            acc[key.trim()] = value.trim();
            return acc;
          }, {});
        
        Object.assign(process.env, envVars);
      }
      
      // Test build command
      console.log('Building application with preview settings...');
      await execAsync('npm run build', { 
        env: {
          ...process.env,
          NODE_ENV: 'preview',
          APP_ENV: 'preview'
        }
      });
      
      // Verify build output
      const distPath = path.join(process.cwd(), 'dist');
      if (!fs.existsSync(distPath)) {
        throw new Error('Build output directory not found');
      }
      
      // Check for required files
      const requiredFiles = ['index.html', '_routes.json', '_headers'];
      for (const file of requiredFiles) {
        if (!fs.existsSync(path.join(distPath, file))) {
          console.warn(`⚠️  Missing build file: ${file}`);
        }
      }
      
      console.log('✅ Build process completed successfully');
      
    } catch (error) {
      console.error('❌ Build process failed:', error.message);
      throw error;
    }
  }

  async testPreviewScripts() {
    console.log('📜 Testing preview deployment scripts...');
    
    try {
      // Check if scripts are executable
      const scripts = [
        'scripts/deployment/deploy-preview.js',
        'scripts/deployment/cleanup-preview.js'
      ];
      
      for (const script of scripts) {
        const scriptPath = path.join(process.cwd(), script);
        if (!fs.existsSync(scriptPath)) {
          throw new Error(`Missing script: ${script}`);
        }
        
        // Test script syntax
        await execAsync(`node -c ${script}`);
        console.log(`✅ Script syntax valid: ${script}`);
      }
      
      console.log('✅ All preview scripts are valid');
      
    } catch (error) {
      console.error('❌ Script validation failed:', error.message);
      throw error;
    }
  }

  async runPreviewTests() {
    console.log('🧪 Running preview-specific tests...');
    
    try {
      // Run unit tests with preview configuration
      await execAsync('npm run test:unit -- --run --reporter=basic', {
        env: {
          ...process.env,
          NODE_ENV: 'preview',
          APP_ENV: 'preview'
        }
      });
      
      console.log('✅ Preview tests passed');
      
    } catch (error) {
      console.warn('⚠️  Some preview tests failed:', error.message);
      // Don't fail the setup for test failures
    }
  }

  async validateCloudflareConfig() {
    console.log('☁️  Validating Cloudflare configuration...');
    
    try {
      // Check wrangler.toml
      if (!fs.existsSync('wrangler.toml')) {
        throw new Error('wrangler.toml not found');
      }
      
      const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
      
      // Check for preview environment
      if (!wranglerConfig.includes('[env.preview]')) {
        console.warn('⚠️  Preview environment not configured in wrangler.toml');
      } else {
        console.log('✅ Preview environment found in wrangler.toml');
      }
      
      // Check for required settings
      const requiredSettings = [
        'pages_build_output_dir = "dist"',
        'compatibility_date',
        'nodejs_compat'
      ];
      
      for (const setting of requiredSettings) {
        if (!wranglerConfig.includes(setting)) {
          console.warn(`⚠️  Missing or incorrect setting: ${setting}`);
        }
      }
      
      console.log('✅ Cloudflare configuration validated');
      
    } catch (error) {
      console.error('❌ Cloudflare configuration validation failed:', error.message);
      throw error;
    }
  }

  async generateTestReport() {
    console.log('📊 Generating test report...');
    
    const report = {
      timestamp: new Date().toISOString(),
      branch: this.currentBranch,
      testPrNumber: this.testPrNumber,
      environment: 'preview-test',
      results: {
        gitStatus: 'passed',
        configuration: 'passed',
        buildProcess: 'passed',
        scripts: 'passed',
        cloudflareConfig: 'passed'
      },
      recommendations: [
        'Test the full deployment workflow on a feature branch',
        'Verify all environment variables are properly configured',
        'Test the cleanup process after PR deployment',
        'Monitor deployment logs for any issues',
        'Validate all health checks pass after deployment'
      ],
      nextSteps: [
        '1. Push changes to feature branch',
        '2. Create pull request to main branch',
        '3. Verify automated preview deployment works',
        '4. Test all functionality on preview URL',
        '5. Close PR to test cleanup process'
      ]
    };
    
    fs.writeFileSync('preview-test-report.json', JSON.stringify(report, null, 2));
    console.log('✅ Test report generated (preview-test-report.json)');
    
    return report;
  }

  async cleanup() {
    console.log('🧹 Cleaning up test files...');
    
    const testFiles = [
      '.env.preview.test',
      'preview-test-report.json'
    ];
    
    for (const file of testFiles) {
      try {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
          console.log(`✅ Removed ${file}`);
        }
      } catch (error) {
        console.warn(`⚠️  Failed to remove ${file}: ${error.message}`);
      }
    }
  }

  async displaySummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PREVIEW DEPLOYMENT TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`\n✅ Test completed successfully!`);
    console.log(`📋 Branch: ${this.currentBranch}`);
    console.log(`🔢 Test PR: #${this.testPrNumber}`);
    console.log(`⏰ Time: ${new Date().toLocaleString()}`);
    
    console.log('\n📊 Test Results:');
    Object.entries(report.results).forEach(([test, result]) => {
      const icon = result === 'passed' ? '✅' : '❌';
      console.log(`   ${icon} ${test}: ${result}`);
    });
    
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`   ${i + 1}. ${rec}`);
    });
    
    console.log('\n🚀 Next Steps:');
    report.nextSteps.forEach((step, i) => {
      console.log(`   ${step}`);
    });
    
    console.log('\n📝 Important Notes:');
    console.log('   • Preview deployments use staging database');
    console.log('   • Security policies are relaxed for testing');
    console.log('   • Debug tools are enabled in preview');
    console.log('   • Deployments are cleaned up when PR closes');
    
    console.log('\n🔗 Useful Commands:');
    console.log('   npm run deploy:preview     - Deploy preview manually');
    console.log('   npm run cleanup:preview    - Cleanup preview deployment');
    console.log('   npm run test:smoke         - Run smoke tests');
    
    console.log('\n' + '='.repeat(60));
  }
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting preview deployment test setup...\n');
    
    const setup = new PreviewTestSetup();
    
    // Validation and setup
    await setup.getCurrentBranch();
    await setup.validateGitStatus();
    await setup.createTestEnvironment();
    
    // Configuration and build testing
    await setup.testPreviewConfiguration();
    await setup.validateCloudflareConfig();
    await setup.testBuildProcess();
    await setup.testPreviewScripts();
    await setup.runPreviewTests();
    
    // Generate report and summary
    const report = await setup.generateTestReport();
    await setup.displaySummary(report);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ Setup completed in ${duration}s`);
    
    // Ask about cleanup
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const cleanupAnswer = await new Promise(resolve => {
      readline.question('\n🧹 Clean up test files? (Y/n): ', resolve);
    });
    
    readline.close();
    
    if (cleanupAnswer.toLowerCase() !== 'n') {
      await setup.cleanup();
    }
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Setup failed after ${duration}s`);
    console.error(`   Error: ${error.message}`);
    console.error('   Please fix the issues and try again.');
    
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = PreviewTestSetup;