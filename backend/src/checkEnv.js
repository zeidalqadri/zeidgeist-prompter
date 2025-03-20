/**
 * Environment Variable Validator
 * 
 * This script checks if all required environment variables are set
 * and logs warnings for any missing variables.
 */

const fs = require('fs');
const path = require('path');

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...');
  
  // Required environment variables
  const requiredVars = [
    'USE_EXTERNAL_APIS'
  ];
  
  // LLM API key variables
  const llmApiKeys = {
    'DEEPSEEK_API_KEY': 'DeepSeek',
    'MISTRAL_API_KEY': 'Mistral', 
    'CLAUDE_API_KEY': 'Claude',
    'GEMINI_API_KEY': 'Gemini'
  };
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️ Warning: No .env file found. Creating a template .env file.');
    createTemplateEnvFile(envPath);
  }
  
  // Check required variables
  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  if (missingRequired.length > 0) {
    console.error(`❌ Error: Missing required environment variables: ${missingRequired.join(', ')}`);
    console.error('Please set these variables in your .env file.');
  } else {
    console.log('✅ All required environment variables are set.');
  }
  
  // Check if external APIs are enabled
  if (process.env.USE_EXTERNAL_APIS === 'true') {
    const configuredLLMs = Object.entries(llmApiKeys)
      .filter(([varName]) => !!process.env[varName])
      .map(([_, name]) => name);
    
    if (configuredLLMs.length === 0) {
      console.error('❌ Error: External APIs are enabled (USE_EXTERNAL_APIS=true), but no LLM API keys are configured!');
      console.error('The system will fall back to rule-based enhancements only, wasting resources.');
      console.error('Please set at least one LLM API key in your .env file or set USE_EXTERNAL_APIS=false.');
    } else {
      console.log(`✅ External APIs enabled with ${configuredLLMs.length} LLM(s) configured: ${configuredLLMs.join(', ')}`);
    }
    
    // Check individual API configurations
    for (const [varName, name] of Object.entries(llmApiKeys)) {
      if (process.env[varName]) {
        const key = process.env[varName];
        if (key.length < 20) {
          console.warn(`⚠️ Warning: ${name} API key (${varName}) looks suspiciously short. Please verify it.`);
        } else {
          console.log(`✅ ${name} API key configured.`);
        }
      } else {
        console.log(`ℹ️ ${name} API key not configured.`);
      }
    }
  } else {
    console.log('ℹ️ External APIs are disabled (USE_EXTERNAL_APIS=false). Using rule-based enhancements only.');
  }
  
  // Check database connection string
  if (process.env.MONGODB_URI) {
    console.log('✅ MongoDB connection string is configured.');
  } else {
    console.log('ℹ️ No MongoDB connection string found. Using file-based storage.');
  }
  
  console.log('✨ Environment check complete.\n');
}

function createTemplateEnvFile(filePath) {
  const template = `# Prompt Enhancer Environment Variables

# Set to 'true' to enable external LLM APIs, 'false' to use only rule-based enhancement
USE_EXTERNAL_APIS=false

# LLM API Keys (at least one required if USE_EXTERNAL_APIS=true)
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=
CLAUDE_API_KEY=
GEMINI_API_KEY=

# Database Configuration
MONGODB_URI=

# Server Configuration
PORT=8081
BASE_PATH=/prompter
NODE_ENV=production
`;

  try {
    fs.writeFileSync(filePath, template);
    console.log(`✅ Created template .env file at ${filePath}`);
    console.log('Please edit this file to add your API keys and other configuration.');
  } catch (error) {
    console.error(`❌ Error creating template .env file: ${error.message}`);
  }
}

// Run the check if this script is executed directly
if (require.main === module) {
  checkEnvironmentVariables();
}

module.exports = { checkEnvironmentVariables }; 