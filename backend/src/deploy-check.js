/**
 * Deployment Check Script
 * 
 * This script performs pre-deployment checks to ensure the system
 * is properly configured. It should be run as part of the deployment process.
 */

const { checkEnvironmentVariables } = require('./checkEnv');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Exit codes
const EXIT_SUCCESS = 0;
const EXIT_WARNING = 1;
const EXIT_ERROR = 2;

// Log levels
const LOG_LEVELS = {
  INFO: '✓ INFO',
  WARN: '⚠️ WARN',
  ERROR: '❌ ERROR'
};

// Required environment variables for production
const REQUIRED_PROD_ENV_VARS = [
  'NODE_ENV',
  'PORT',
  'BASE_PATH',
  'USE_EXTERNAL_APIS'
];

// Track warnings and errors
let warningCount = 0;
let errorCount = 0;

// Logger function with levels
function log(level, message) {
  console.log(`${level}: ${message}`);
  if (level === LOG_LEVELS.WARN) warningCount++;
  if (level === LOG_LEVELS.ERROR) errorCount++;
}

// Check database connection
async function checkDatabaseConnection() {
  if (!process.env.DATABASE_URL) {
    log(LOG_LEVELS.WARN, 'No PostgreSQL DATABASE_URL configured. Will use file-based storage in production.');
    log(LOG_LEVELS.WARN, 'This limits scalability and reliability. Consider adding a PostgreSQL connection.');
    return false;
  }
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    
    log(LOG_LEVELS.INFO, 'Successfully connected to PostgreSQL database');
    await pool.end();
    return true;
  } catch (error) {
    log(LOG_LEVELS.ERROR, `Database connection failed: ${error.message}`);
    log(LOG_LEVELS.ERROR, 'Fix the PostgreSQL connection string before deployment.');
    return false;
  }
}

// Check if external APIs are properly configured
function checkExternalApis() {
  if (process.env.USE_EXTERNAL_APIS !== 'true') {
    log(LOG_LEVELS.WARN, 'External APIs are disabled. System will use rule-based enhancement only.');
    log(LOG_LEVELS.WARN, 'Set USE_EXTERNAL_APIS=true and configure API keys to use LLM enhancement.');
    return false;
  }
  
  // Check if at least one LLM API key is configured
  const llmApiKeys = {
    'DEEPSEEK_API_KEY': 'DeepSeek',
    'MISTRAL_API_KEY': 'Mistral',
    'CLAUDE_API_KEY': 'Claude',
    'GEMINI_API_KEY': 'Gemini'
  };
  
  const configuredLLMs = Object.entries(llmApiKeys)
    .filter(([key]) => !!process.env[key])
    .map(([_, name]) => name);
  
  if (configuredLLMs.length === 0) {
    log(LOG_LEVELS.ERROR, 'External APIs are enabled (USE_EXTERNAL_APIS=true), but no LLM API keys are configured!');
    log(LOG_LEVELS.ERROR, 'This will cause all LLM enhancements to fail and fall back to rule-based.');
    log(LOG_LEVELS.ERROR, 'Configure at least one LLM API key or set USE_EXTERNAL_APIS=false.');
    return false;
  }
  
  log(LOG_LEVELS.INFO, `External APIs enabled with ${configuredLLMs.length} LLM(s) configured: ${configuredLLMs.join(', ')}`);
  
  // Check API key lengths as a simple validation
  for (const [key, name] of Object.entries(llmApiKeys)) {
    if (process.env[key]) {
      if (process.env[key].length < 20) {
        log(LOG_LEVELS.WARN, `${name} API key (${key}) appears to be too short. Verify this key.`);
      } else {
        log(LOG_LEVELS.INFO, `${name} API key configured with valid length`);
      }
    }
  }
  
  return true;
}

// Check required environment variables for production
function checkRequiredEnvVars() {
  const missingVars = REQUIRED_PROD_ENV_VARS.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    log(LOG_LEVELS.ERROR, `Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  log(LOG_LEVELS.INFO, 'All required environment variables are set');
  return true;
}

// Check if node_modules exists and package.json dependencies are installed
function checkDependencies() {
  const nodeModulesPath = path.join(__dirname, '../../node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log(LOG_LEVELS.ERROR, 'node_modules directory not found. Dependencies are not installed.');
    log(LOG_LEVELS.ERROR, 'Run "npm install" before deployment.');
    return false;
  }
  
  // Check if key dependencies are installed
  const requiredDeps = ['express', 'pg', 'node-fetch'];
  const missingDeps = [];
  
  for (const dep of requiredDeps) {
    const depPath = path.join(nodeModulesPath, dep);
    if (!fs.existsSync(depPath)) {
      missingDeps.push(dep);
    }
  }
  
  if (missingDeps.length > 0) {
    log(LOG_LEVELS.ERROR, `Missing dependencies: ${missingDeps.join(', ')}`);
    log(LOG_LEVELS.ERROR, 'Run "npm install" to install all dependencies.');
    return false;
  }
  
  log(LOG_LEVELS.INFO, 'Dependencies are installed');
  return true;
}

// Main deployment check function
async function runDeploymentChecks() {
  console.log('======= DEPLOYMENT CHECK =======');
  console.log('Running pre-deployment checks...');
  console.log('================================\n');
  
  log(LOG_LEVELS.INFO, `Node.js version: ${process.version}`);
  log(LOG_LEVELS.INFO, `Environment: ${process.env.NODE_ENV || 'not set'}`);
  
  // Run all checks
  const envVarsOk = checkRequiredEnvVars();
  const depsOk = checkDependencies();
  const apisOk = checkExternalApis();
  const dbOk = await checkDatabaseConnection();
  
  // Print summary
  console.log('\n======= CHECK SUMMARY =======');
  console.log(`Environment Variables: ${envVarsOk ? '✓' : '✗'}`);
  console.log(`Dependencies: ${depsOk ? '✓' : '✗'}`);
  console.log(`External APIs: ${apisOk ? '✓' : '✗'}`);
  console.log(`Database: ${dbOk ? '✓' : '✗'}`);
  console.log(`Total Warnings: ${warningCount}`);
  console.log(`Total Errors: ${errorCount}`);
  console.log('============================\n');
  
  if (errorCount > 0) {
    console.log('❌ Deployment check failed with errors. Fix issues before deploying.');
    process.exit(EXIT_ERROR);
  } else if (warningCount > 0) {
    console.log('⚠️ Deployment check passed with warnings. Review warnings before deploying.');
    // Continue with warnings
    console.log('Starting API server despite warnings...');
    require('./api');
  } else {
    console.log('✅ All deployment checks passed successfully!');
    console.log('Starting API server...');
    require('./api');
  }
}

// Run the checks if this script is executed directly
if (require.main === module) {
  // First run the environment variable checker
  checkEnvironmentVariables();
  
  // Then run deployment checks
  runDeploymentChecks().catch(error => {
    console.error('Error during deployment check:', error);
    process.exit(EXIT_ERROR);
  });
}

module.exports = { runDeploymentChecks }; 