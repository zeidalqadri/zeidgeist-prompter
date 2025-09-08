#!/usr/bin/env node

/**
 * Pre-deployment validation script
 * Validates environment, runs tests, and prepares deployment
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs');
const path = require('path');

const execAsync = util.promisify(exec);

async function validateEnvironment() {
  console.log('🔍 Validating environment variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'JWT_SECRET', 
    'NODE_ENV'
  ];
  
  if (process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging') {
    requiredVars.push('NEXTAUTH_SECRET');
  }
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Check if at least one API key is configured
  const apiKeys = [
    'CLAUDE_API_KEY',
    'OPENAI_API_KEY', 
    'MISTRAL_API_KEY',
    'DEEPSEEK_API_KEY',
    'MOONSHOT_API_KEY'
  ];
  
  const configuredApis = apiKeys.filter(key => process.env[key]);
  
  if (configuredApis.length === 0) {
    console.warn('⚠️  No external API keys configured. Application will use local enhancement only.');
  } else {
    console.log(`✅ Found ${configuredApis.length} configured API key(s)`);
  }
  
  console.log('✅ Environment validation passed');
}

async function runTests() {
  console.log('🧪 Running test suite...');
  
  try {
    await execAsync('npm run test:unit');
    console.log('✅ Unit tests passed');
    
    await execAsync('npm run test:integration');
    console.log('✅ Integration tests passed');
    
  } catch (error) {
    console.error('❌ Tests failed:', error.message);
    throw error;
  }
}

async function validateDatabase() {
  console.log('🗃️  Validating database connection...');
  
  try {
    // Run a simple database validation
    await execAsync('npm run db:generate');
    console.log('✅ Database schema validation passed');
    
  } catch (error) {
    console.error('❌ Database validation failed:', error.message);
    throw error;
  }
}

async function buildApplication() {
  console.log('🏗️  Building application...');
  
  try {
    await execAsync('npm run build');
    
    // Verify build output
    const distPath = path.join(process.cwd(), 'dist');
    const requiredFiles = [
      'index.html',
      '_routes.json',
      '_headers'
    ];
    
    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Missing required build file: ${file}`);
      }
    }
    
    console.log('✅ Build completed and validated');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    throw error;
  }
}

async function securityChecks() {
  console.log('🔒 Running security checks...');
  
  try {
    // Run security audit
    await execAsync('npm audit --audit-level high', { 
      stdio: ['ignore', 'pipe', 'pipe']
    });
    console.log('✅ Security audit passed');
    
  } catch (error) {
    // npm audit returns non-zero exit code for vulnerabilities
    if (error.message.includes('high') || error.message.includes('critical')) {
      console.error('❌ High or critical security vulnerabilities found');
      throw error;
    } else {
      console.warn('⚠️  Some security issues found, but no high/critical vulnerabilities');
    }
  }
}

async function validateDeploymentConfig() {
  console.log('⚙️  Validating deployment configuration...');
  
  const configFiles = [
    'wrangler.toml',
    '_routes.json',
    '_headers',
    'package.json'
  ];
  
  for (const file of configFiles) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing deployment config file: ${file}`);
    }
  }
  
  // Validate wrangler.toml
  const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');
  if (!wranglerConfig.includes('pages_build_output_dir = "dist"')) {
    console.warn('⚠️  Wrangler config may not have correct output directory');
  }
  
  console.log('✅ Deployment configuration validated');
}

async function generateDeploymentInfo() {
  console.log('📋 Generating deployment information...');
  
  const deploymentInfo = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    version: process.env.APP_VERSION || '1.0.0',
    commit: process.env.GITHUB_SHA || 'unknown',
    branch: process.env.GITHUB_REF_NAME || 'unknown',
    buildNumber: process.env.GITHUB_RUN_NUMBER || 'local',
  };
  
  // Write deployment info to dist directory
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  
  fs.writeFileSync(
    path.join('dist', 'deployment-info.json'),
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log('✅ Deployment information generated');
  console.log(`   Environment: ${deploymentInfo.environment}`);
  console.log(`   Version: ${deploymentInfo.version}`);
  console.log(`   Commit: ${deploymentInfo.commit.slice(0, 8)}`);
}

async function main() {
  const startTime = Date.now();
  
  try {
    console.log('🚀 Starting pre-deployment validation...\n');
    
    await validateEnvironment();
    await validateDeploymentConfig();
    await validateDatabase();
    await securityChecks();
    await runTests();
    await buildApplication();
    await generateDeploymentInfo();
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Pre-deployment validation completed successfully!');
    console.log(`   Duration: ${duration}s`);
    console.log('   Application is ready for deployment 🚀');
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Pre-deployment validation failed after ${duration}s`);
    console.error(`   Error: ${error.message}`);
    console.error('   Deployment cannot proceed until issues are resolved.');
    
    process.exit(1);
  }
}

main();