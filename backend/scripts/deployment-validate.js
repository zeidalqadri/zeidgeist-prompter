// Deployment validation script
console.log('\n======= DEPLOYMENT VALIDATION =======');

// Check required environment variables
const requiredVars = ['BASE_PATH', 'USE_EXTERNAL_APIS'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️ Warning: Missing recommended variables: ${missingVars.join(', ')}`);
  console.log('Setting defaults for missing variables...');
  
  // Set defaults instead of failing
  if (!process.env.BASE_PATH) process.env.BASE_PATH = '/prompter';
  if (!process.env.USE_EXTERNAL_APIS) process.env.USE_EXTERNAL_APIS = 'false';
} else {
  console.log('✓ All required environment variables present');
}

// Database check
if (!process.env.DATABASE_URL) {
  console.warn('⚠️ Warning: No PostgreSQL DATABASE_URL configured. Using file-based storage.');
  console.warn('This limits scalability but the application will still function.');
} else {
  console.log('✓ PostgreSQL connection string found');
}

// API Keys check
if (process.env.USE_EXTERNAL_APIS === 'true') {
  const apiKeys = ['DEEPSEEK_API_KEY', 'MISTRAL_API_KEY', 'CLAUDE_API_KEY', 'GEMINI_API_KEY'];
  const availableApis = apiKeys.filter(key => process.env[key]);
  
  if (availableApis.length === 0) {
    console.warn('⚠️ Warning: External APIs enabled but no API keys found.');
    console.warn('System will fall back to rule-based enhancement only.');
  } else {
    console.log(`✓ Found ${availableApis.length} API keys for LLM enhancement`);
  }
} else {
  console.log('ℹ️ External APIs disabled. Using rule-based enhancements only.');
}

console.log('======= VALIDATION COMPLETE =======\n');
// Always exit with success to continue deployment
process.exit(0); 