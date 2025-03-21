// Example config file
const config = {
  basePath: process.env.BASE_PATH || '/prompter',
  useExternalApis: process.env.USE_EXTERNAL_APIS === 'true',
  mongodb: {
    uri: process.env.MONGODB_URI || null,
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  },
  apiKeys: {
    deepseek: process.env.DEEPSEEK_API_KEY,
    mistral: process.env.MISTRAL_API_KEY,
    claude: process.env.CLAUDE_API_KEY,
    gemini: process.env.GEMINI_API_KEY
  }
};

// Log configuration (without sensitive data)
console.log('Configuration loaded:');
console.log(`- Base Path: ${config.basePath}`);
console.log(`- External APIs: ${config.useExternalApis ? 'Enabled' : 'Disabled'}`);
console.log(`- Database: ${config.mongodb.uri ? 'MongoDB' : 'File-based storage'}`);

// Count available API keys
const availableApiKeys = Object.values(config.apiKeys).filter(key => key).length;
console.log(`- Available API keys: ${availableApiKeys}`);

module.exports = config; 