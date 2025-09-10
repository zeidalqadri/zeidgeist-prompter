#!/usr/bin/env node

/**
 * Deployment Readiness Assessment
 * Comprehensive check of deployment infrastructure and configuration
 */

const fs = require('fs');
const path = require('path');

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  console.log(`${exists ? '✅' : '❌'} ${description}: ${filePath}`);
  return exists;
}

function checkDirectory(dirPath, description) {
  const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  console.log(`${exists ? '✅' : '❌'} ${description}: ${dirPath}`);
  return exists;
}

function checkPackageScript(scriptName) {
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const exists = packageJson.scripts && packageJson.scripts[scriptName];
    console.log(`${exists ? '✅' : '❌'} NPM Script: ${scriptName}`);
    return exists;
  } catch (error) {
    console.log(`❌ Error reading package.json: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Deployment Readiness Assessment\n');
  console.log('=' .repeat(50));

  let score = 0;
  let maxScore = 0;

  // Configuration Files
  console.log('\n📋 Configuration Files:');
  maxScore += 8;
  // Check for wrangler configuration (prioritize Pages)
  if (fs.existsSync('wrangler.pages.toml')) {
    console.log('✅ wrangler.pages.toml - Wrangler Pages configuration');
    score += 1;
  } else if (fs.existsSync('wrangler.workers.toml')) {
    console.log('✅ wrangler.workers.toml - Wrangler Workers configuration');
    score += 1;
  } else {
    console.log('❌ Missing wrangler configuration file');
  }
  score += checkFile('package.json', 'Package configuration') ? 1 : 0;
  score += checkFile('next.config.js', 'Next.js configuration') ? 1 : 0;
  score += checkFile('_routes.json', 'Cloudflare routes') ? 1 : 0;
  score += checkFile('_headers', 'Security headers') ? 1 : 0;
  score += checkFile('drizzle.config.ts', 'Database configuration') ? 1 : 0;
  score += checkFile('env.example', 'Environment template') ? 1 : 0;
  score += checkFile('DEPLOYMENT-GUIDE.md', 'Deployment documentation') ? 1 : 0;

  // Application Structure
  console.log('\n📁 Application Structure:');
  maxScore += 6;
  score += checkDirectory('app', 'Next.js app directory') ? 1 : 0;
  score += checkDirectory('functions', 'Cloudflare Functions') ? 1 : 0;
  score += checkDirectory('app/lib/config', 'Configuration library') ? 1 : 0;
  score += checkDirectory('app/lib/health', 'Health check system') ? 1 : 0;
  score += checkDirectory('scripts/deployment', 'Deployment scripts') ? 1 : 0;
  score += checkDirectory('tests', 'Test suite') ? 1 : 0;

  // Deployment Scripts
  console.log('\n🛠️  Deployment Scripts:');
  maxScore += 7;
  score += checkFile('scripts/deployment/pre-deploy.js', 'Pre-deployment validation') ? 1 : 0;
  score += checkFile('scripts/deployment/post-deploy.js', 'Post-deployment validation') ? 1 : 0;
  score += checkFile('scripts/deployment/migrate-database.js', 'Database migration') ? 1 : 0;
  score += checkFile('scripts/deployment/deployment-readiness.js', 'Readiness check') ? 1 : 0;
  score += checkFile('scripts/build-cloudflare.js', 'Cloudflare build script') ? 1 : 0;
  score += checkFile('scripts/setup-production.js', 'Production setup') ? 1 : 0;
  score += checkFile('scripts/performance-test.js', 'Performance testing') ? 1 : 0;

  // CI/CD Workflows
  console.log('\n⚙️  CI/CD Workflows:');
  maxScore += 4;
  score += checkFile('.github/workflows/ci.yml', 'Main CI/CD pipeline') ? 1 : 0;
  score += checkFile('.github/workflows/monitoring.yml', 'Production monitoring') ? 1 : 0;
  score += checkFile('.github/workflows/rollback.yml', 'Emergency rollback') ? 1 : 0;
  score += checkDirectory('.github/workflows', 'Workflows directory') ? 1 : 0;

  // Health & Monitoring
  console.log('\n🏥 Health & Monitoring:');
  maxScore += 4;
  score += checkFile('functions/api/health/index.ts', 'Health endpoint') ? 1 : 0;
  score += checkFile('functions/api/health/liveness.ts', 'Liveness probe') ? 1 : 0;
  score += checkFile('functions/api/health/readiness.ts', 'Readiness probe') ? 1 : 0;
  score += checkFile('app/lib/health/health-checks.ts', 'Health check system') ? 1 : 0;

  // NPM Scripts
  console.log('\n📦 NPM Scripts:');
  maxScore += 10;
  score += checkPackageScript('build') ? 1 : 0;
  score += checkPackageScript('test:unit') ? 1 : 0;
  score += checkPackageScript('test:integration') ? 1 : 0;
  score += checkPackageScript('test:e2e') ? 1 : 0;
  score += checkPackageScript('deploy:pre') ? 1 : 0;
  score += checkPackageScript('deploy:post') ? 1 : 0;
  score += checkPackageScript('deploy:migrate') ? 1 : 0;
  score += checkPackageScript('health:check') ? 1 : 0;
  score += checkPackageScript('validate:env') ? 1 : 0;
  score += checkPackageScript('db:migrate') ? 1 : 0;

  // Security Files
  console.log('\n🔒 Security Configuration:');
  maxScore += 3;
  score += checkFile('app/lib/config/environment.ts', 'Environment validation') ? 1 : 0;
  score += checkFile('functions/_shared/auth.ts', 'Authentication system') ? 1 : 0;
  score += checkFile('functions/_shared/privacy-guard.ts', 'Privacy protection') ? 1 : 0;

  // Database & Schema
  console.log('\n🗃️  Database Configuration:');
  maxScore += 3;
  score += checkFile('app/lib/db/schema.ts', 'Database schema') ? 1 : 0;
  score += checkDirectory('migrations', 'Migration directory') ? 1 : 0;
  score += checkFile('app/lib/db/index.ts', 'Database connection') ? 1 : 0;

  // Environment Check
  console.log('\n🌍 Environment Configuration:');
  maxScore += 2;
  
  try {
    let wranglerConfig;
    let configFile;
    
    if (fs.existsSync('wrangler.pages.toml')) {
      wranglerConfig = fs.readFileSync('wrangler.pages.toml', 'utf8');
      configFile = 'wrangler.pages.toml';
    } else if (fs.existsSync('wrangler.workers.toml')) {
      wranglerConfig = fs.readFileSync('wrangler.workers.toml', 'utf8');
      configFile = 'wrangler.workers.toml';
    } else {
      throw new Error('No wrangler configuration file found');
    }
    
    const hasEnvironments = wranglerConfig.includes('[env.production]') && 
                           wranglerConfig.includes('[env.preview]');
    console.log(`${hasEnvironments ? '✅' : '❌'} Environment configurations in ${configFile}`);
    score += hasEnvironments ? 1 : 0;
  } catch (error) {
    console.log('❌ Error reading wrangler configuration file');
  }
  
  try {
    const envExample = fs.readFileSync('env.example', 'utf8');
    const hasRequiredVars = envExample.includes('DATABASE_URL') && 
                           envExample.includes('JWT_SECRET');
    console.log(`${hasRequiredVars ? '✅' : '❌'} Required variables in env.example`);
    score += hasRequiredVars ? 1 : 0;
  } catch (error) {
    console.log('❌ Error reading env.example');
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 DEPLOYMENT READINESS SUMMARY');
  console.log('=' .repeat(50));
  
  const percentage = Math.round((score / maxScore) * 100);
  const status = percentage >= 90 ? '🟢 READY' : 
                percentage >= 75 ? '🟡 MOSTLY READY' :
                percentage >= 50 ? '🟠 NEEDS WORK' : '🔴 NOT READY';
  
  console.log(`Score: ${score}/${maxScore} (${percentage}%)`);
  console.log(`Status: ${status}`);
  
  if (percentage >= 90) {
    console.log('\n✅ Your application is ready for production deployment!');
    console.log('\nNext Steps:');
    console.log('1. Configure GitHub Secrets');
    console.log('2. Set up database (staging & production)');
    console.log('3. Configure Cloudflare account');
    console.log('4. Push to develop branch for staging deployment');
    console.log('5. Push to master branch for production deployment');
  } else {
    console.log('\n⚠️  Your application needs additional configuration before deployment.');
    console.log('\nMissing Components:');
    
    if (score < maxScore) {
      console.log('- Review the failed checks above');
      console.log('- Ensure all required files are present');
      console.log('- Run setup scripts if needed');
    }
  }

  console.log('\n📖 For detailed instructions, see DEPLOYMENT-GUIDE.md');
  
  if (percentage < 90) {
    process.exit(1);
  }
}

main().catch(console.error);