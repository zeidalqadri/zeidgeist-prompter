/**
 * Health Check Script
 * 
 * This script performs diagnostic checks on the system and can apply
 * automatic fixes for common issues.
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { checkEnvironmentVariables } = require('./checkEnv');

// Read port from .port file or use default
function getServerPort() {
  try {
    const portFile = path.join(__dirname, '../.port');
    if (fs.existsSync(portFile)) {
      const port = fs.readFileSync(portFile, 'utf8').trim();
      return parseInt(port, 10);
    }
  } catch (error) {
    console.error('Error reading port file:', error);
  }
  return process.env.PORT || 8081;
}

// Check API server health
async function checkApiHealth() {
  console.log('🔍 Checking API server health...');
  const port = getServerPort();
  const baseUrl = `http://localhost:${port}`;
  const apiPath = process.env.BASE_PATH ? `${process.env.BASE_PATH}/api` : '/api';
  const healthUrl = `${baseUrl}${apiPath}/health`;
  
  try {
    const response = await fetch(healthUrl);
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ API server is running on port ${port}`);
      console.log(`   Version: ${data.version}`);
      console.log(`   Base path: ${data.basePath || '/'}`);
      return true;
    } else {
      console.error(`❌ API server returned error: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ API server not responding: ${error.message}`);
    console.error(`   Failed to connect to ${healthUrl}`);
    return false;
  }
}

// Check API status to verify LLM configurations
async function checkApiStatus() {
  console.log('🔍 Checking API status and LLM configurations...');
  const port = getServerPort();
  const baseUrl = `http://localhost:${port}`;
  const apiPath = process.env.BASE_PATH ? `${process.env.BASE_PATH}/api` : '/api';
  const statusUrl = `${baseUrl}${apiPath}/status`;
  
  try {
    const response = await fetch(statusUrl);
    if (!response.ok) {
      console.error(`❌ API status check failed: ${response.status} ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    // Check external APIs status
    if (data.externalApisEnabled) {
      console.log('✅ External APIs are enabled');
      
      if (data.availableLLMs && data.availableLLMs.length > 0) {
        console.log(`✅ Available LLMs: ${data.availableLLMs.join(', ')}`);
      } else {
        console.error('❌ No LLMs available despite external APIs being enabled');
        console.log('   This indicates a configuration issue with API keys');
      }
      
      // Check individual LLM configurations
      console.log('LLM API configurations:');
      console.log(`   DeepSeek: ${data.deepseekConfigured ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   Mistral: ${data.mistralConfigured ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   Claude: ${data.claudeConfigured ? '✅ Configured' : '❌ Not configured'}`);
      console.log(`   Gemini: ${data.geminiConfigured ? '✅ Configured' : '❌ Not configured'}`);
    } else {
      console.log('ℹ️ External APIs are disabled, using rule-based enhancement only');
    }
    
    return true;
  } catch (error) {
    console.error(`❌ Error checking API status: ${error.message}`);
    return false;
  }
}

// Check database connection
async function checkDatabase() {
  console.log('🔍 Checking database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.log('ℹ️ No PostgreSQL DATABASE_URL configured, using file-based storage');
    return true;
  }
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection and check tables
    const client = await pool.connect();
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    const { rows: tables } = await client.query(tablesQuery);
    
    console.log(`✅ Successfully connected to PostgreSQL database`);
    console.log(`   Found ${tables.length} tables`);
    
    // Check for expected tables
    const expectedTables = ['history', 'feedback', 'llm_enhancements'];
    const missingTables = expectedTables.filter(
      name => !tables.some(table => table.table_name === name)
    );
    
    if (missingTables.length > 0) {
      console.warn(`⚠️ Warning: Missing expected tables: ${missingTables.join(', ')}`);
      console.log('   These will be created automatically when needed');
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    return false;
  }
}

// Run diagnostics with optional LLM API tests
async function runDiagnostics() {
  console.log('🔧 Running system diagnostics...\n');
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Check API server health
  const apiHealthOk = await checkApiHealth();
  
  if (!apiHealthOk) {
    console.log('\n⚠️ API server not responding. Please start the server before running diagnostics.');
    return;
  }
  
  // Check API status and LLM configurations
  await checkApiStatus();
  
  // Check database connection
  await checkDatabase();
  
  console.log('\n✅ Diagnostics complete.');
}

// Run full check with LLM API connectivity tests
async function runFullCheck() {
  console.log('🔬 Running full system check with LLM API tests...\n');
  
  // Check environment variables
  checkEnvironmentVariables();
  
  // Check API server health
  const apiHealthOk = await checkApiHealth();
  
  if (!apiHealthOk) {
    console.log('\n⚠️ API server not responding. Please start the server before running full checks.');
    return;
  }
  
  // Run the diagnostic endpoint to test LLM API connectivity
  try {
    const port = getServerPort();
    const baseUrl = `http://localhost:${port}`;
    const apiPath = process.env.BASE_PATH ? `${process.env.BASE_PATH}/api` : '/api';
    const diagnoseUrl = `${baseUrl}${apiPath}/diagnose`;
    
    console.log('🔍 Testing LLM API connectivity...');
    const response = await fetch(diagnoseUrl);
    
    if (!response.ok) {
      console.error(`❌ Diagnostic endpoint returned error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    // Display environment info
    console.log('\nEnvironment variables:');
    for (const [key, value] of Object.entries(data.environment)) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Display database status
    console.log(`\nDatabase status: ${data.database}`);
    
    // Display LLM API test results
    if (Object.keys(data.llmApiTests).length > 0) {
      console.log('\nLLM API connectivity tests:');
      for (const [llm, result] of Object.entries(data.llmApiTests)) {
        if (result.success) {
          console.log(`   ✅ ${llm}: Connected successfully (${result.responseTime}ms)`);
        } else {
          console.log(`   ❌ ${llm}: Connection failed - ${result.error}`);
          if (result.details) {
            console.log(`      Details: ${JSON.stringify(result.details)}`);
          }
        }
      }
    } else {
      console.log('\nℹ️ No LLM API tests performed (external APIs may be disabled)');
    }
  } catch (error) {
    console.error(`❌ Error running diagnostic tests: ${error.message}`);
  }
  
  console.log('\n✅ Full system check complete.');
}

// Run the healthcheck if this script is executed directly
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--full')) {
    runFullCheck();
  } else {
    runDiagnostics();
  }
}

module.exports = {
  runDiagnostics,
  runFullCheck,
  checkApiHealth,
  checkDatabase
}; 