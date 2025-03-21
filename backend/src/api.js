/**
 * Prompt Enhancer API
 * 
 * This module provides API endpoints for the prompt enhancement system.
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { enhancePrompt: ruleBasedEnhance, enhancePromptBatch, learnFromFeedback } = require('./prompt-enhancer');
const { enhancePrompt: llmEnhance, getAvailableLLMs } = require('./llm-enhancer');
const { trainFromFile } = require('./training/batchTrainer');
const patternLearner = require('./learning/patternLearner');
const ruleWeightLearner = require('./learning/ruleWeightLearner');
const net = require('net');
const { initDatabase, getDb, getUserIdentifier } = require('./pgdb');
const { checkEnvironmentVariables } = require('./checkEnv');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Run environment variable check at startup
checkEnvironmentVariables();

// Create Express app
const app = express();
// Get port from environment variable or command line argument
const port = process.argv.includes('--port') 
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : parseInt(process.env.PORT || '10000', 10);
const NEXT_PORT = process.env.NEXT_PORT || 3000;
const basePath = process.env.BASE_PATH || '';

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Middleware
app.use(cors());
app.use(express.json());

// Add a root health check endpoint for Render
app.get('/', (req, res) => {
  console.log('Root health check endpoint called');
  res.status(200).json({ status: 'ok', message: 'Zeidgeist Prompter API is running' });
});

// Set up base path for production environment
const apiBasePath = basePath ? `${basePath}/api` : '/api';

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer()
      .once('error', () => {
        // Port is in use
        resolve(true);
      })
      .once('listening', () => {
        // Port is free, close the server
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort) {
  let port = startPort;
  const MAX_PORT = startPort + 100; // Try up to 100 ports after the start port
  
  while (port < MAX_PORT) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port;
    }
    port++;
  }
  
  throw new Error(`Could not find an available port in range ${startPort}-${MAX_PORT}`);
}

// New diagnostic endpoints for troubleshooting LLM issues
app.get(`${apiBasePath}/diagnose`, async (req, res) => {
  try {
    // Check environment variables
    const envVars = {
      USE_EXTERNAL_APIS: process.env.USE_EXTERNAL_APIS,
      DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
      MISTRAL_API_KEY: !!process.env.MISTRAL_API_KEY,
      CLAUDE_API_KEY: !!process.env.CLAUDE_API_KEY,
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      NODE_ENV: process.env.NODE_ENV,
      BASE_PATH: process.env.BASE_PATH,
    };
    
    // Check database connection
    let dbStatus = 'Not initialized';
    try {
      const db = getDb();
      dbStatus = db ? 'Connected' : 'Failed to connect';
    } catch (dbError) {
      dbStatus = `Error: ${dbError.message}`;
    }
    
    // Test LLM API connectivity if enabled
    const llmTests = {};
    if (process.env.USE_EXTERNAL_APIS === 'true') {
      const availableLLMs = getAvailableLLMs();
      for (const llm of availableLLMs) {
        try {
          // Run a minimal test request to each LLM
          const testResult = await testLLMConnection(llm);
          llmTests[llm] = testResult;
        } catch (error) {
          llmTests[llm] = { success: false, error: error.message };
        }
      }
    }
    
    return res.json({
      environment: envVars,
      database: dbStatus,
      llmApiTests: llmTests,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Helper function to test LLM API connectivity
async function testLLMConnection(llm) {
  const { testLLMConnection } = require('./llm-enhancer');
  return await testLLMConnection(llm);
}

// Define all your API endpoints first

// API health check
app.get(`${apiBasePath}/health`, (req, res) => {
  console.log('API health check endpoint called');
  res.status(200).json({ status: 'ok', version: '0.1.0', basePath });
});

// API status endpoint
app.get(`${apiBasePath}/status`, (req, res) => {
  console.log('API status endpoint called');
  try {
    const externalApisEnabled = process.env.USE_EXTERNAL_APIS === 'true';
    const availableLLMs = externalApisEnabled ? getAvailableLLMs() : [];
    
    return res.json({
      success: true,
      externalApisEnabled,
      availableLLMs,
      deepseekConfigured: !!process.env.DEEPSEEK_API_KEY,
      mistralConfigured: !!process.env.MISTRAL_API_KEY,
      claudeConfigured: !!process.env.CLAUDE_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    });
  } catch (error) {
    console.error('Error getting API status:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Frontend serving
// =============================================================
app.use(`${basePath}/static`, express.static(path.join(__dirname, '../../frontend/.next/static')));
app.use(`${basePath}/public`, express.static(path.join(__dirname, '../../frontend/public')));
const nextStaticPath = path.join(__dirname, '../../frontend/.next/static');
const publicPath = path.join(__dirname, '../../frontend/public');

// Add this right after the path definitions and before any other code
// Log existence of frontend files for debugging
const serverDir = path.join(__dirname, '../../frontend/.next/server');
const pagesDir = path.join(serverDir, 'pages');
const appDir = path.join(serverDir, 'app');

console.log('Checking for frontend build files:');
console.log('- Server directory exists:', fs.existsSync(serverDir));
console.log('- Pages directory exists:', fs.existsSync(pagesDir));
console.log('- App directory exists:', fs.existsSync(appDir));

// Check specifically for index files
const pagesIndexPath = path.join(pagesDir, 'index.html');
const appIndexPath = path.join(appDir, 'index.html');
console.log('- Pages index.html exists:', fs.existsSync(pagesIndexPath));
console.log('- App index.html exists:', fs.existsSync(appIndexPath));

// Use the correct index path based on what exists
const indexHtmlPath = fs.existsSync(pagesIndexPath) 
  ? pagesIndexPath 
  : fs.existsSync(appIndexPath) 
    ? appIndexPath 
    : path.join(__dirname, '../../frontend/.next/server/pages/index.html');

console.log('- Using index path:', indexHtmlPath);

// Define the API routes before the catch-all route

/**
 * Enhance a single prompt
 * POST /api/enhance
 * Request body: { prompt: string, context?: string }
 * Response: { enhancedPrompt: string, wasEnhanced: boolean, enhancements: Array, metadata: Object }
 */
app.post(`${apiBasePath}/enhance`, async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await ruleBasedEnhance(prompt, context || '');
    res.status(200).json(result);
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    res.status(500).json({ 
      error: 'Error enhancing prompt',
      message: error.message
    });
  }
});

/**
 * Engineer endpoint - this maps to the enhance functionality for the Next.js frontend
 * POST /api/engineer
 * Request body: { prompt: string, context?: string, isRefinement?: boolean, isExpansion?: boolean, isChunk?: boolean, ... }
 * Response: { result: string, metadata: Object }
 */
app.post(`${apiBasePath}/engineer`, async (req, res) => {
  try {
    const { prompt, context, isRefinement, isExpansion, repeatCount, isChunk, chunkIndex, totalChunks } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    // Log request for debugging
    console.log(`Processing engineer request - ${prompt.length} chars`, {
      isRefinement, 
      isExpansion, 
      isChunk: isChunk ? `${chunkIndex+1}/${totalChunks}` : false
    });
    
    // First try to use LLM enhancement
    let result;
    let enhancementMethod = 'llm';
    let llmError = null;
    
    // Check if external APIs are enabled
    const externalApisEnabled = process.env.USE_EXTERNAL_APIS === 'true';
    
    if (!externalApisEnabled) {
      console.log('External APIs are disabled, using rule-based enhancement');
      result = await ruleBasedEnhance(prompt, context || '');
      enhancementMethod = 'rule-based';
    } else {
      // External APIs are enabled, try LLM enhancement
      try {
        console.log('Attempting LLM enhancement...');
        result = await llmEnhance(prompt, context || '', isRefinement);
        
        // Log which LLM was used
        if (result.metadata && result.metadata.source) {
          console.log(`Enhanced prompt using ${result.metadata.source} LLM`);
          
          // Store successful LLM enhancement in database for future learning
          try {
            const db = getDb();
            if (db) {
              // PostgreSQL version of insertion
              const client = await db.connect();
              await client.query(
                `INSERT INTO llm_enhancements 
                 (originalprompt, enhancedprompt, context, source, model, timestamp, learned) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                [
                  prompt, 
                  result.enhancedPrompt, 
                  context || null, 
                  result.metadata.source, 
                  result.metadata.model, 
                  new Date(),
                  false
                ]
              );
              client.release();
              console.log('Stored successful LLM enhancement for learning');
            }
          } catch (dbError) {
            console.error('Failed to store LLM enhancement:', dbError);
            // Continue anyway - the enhancement still worked
          }
        }
        
        // If the LLM enhancement wasn't successful or didn't make changes, fall back to rule-based
        if (!result.wasEnhanced || (result.metadata && result.metadata.success === false)) {
          console.log('LLM enhancement failed or made no changes, falling back to rule-based enhancement');
          result = await ruleBasedEnhance(prompt, context || '');
          enhancementMethod = 'rule-based';
        }
      } catch (error) {
        // If LLM enhancement failed, log details and fall back to rule-based
        console.error('Error using LLM enhancement, falling back to rule-based:', error.message);
        llmError = error.message;
        result = await ruleBasedEnhance(prompt, context || '');
        enhancementMethod = 'rule-based';
      }
    }
    
    // Format the response to match what the frontend expects
    let enhancedContent = result.enhancedPrompt;
    
    // Ensure proper line breaks and formatting
    if (typeof enhancedContent === 'string') {
      // Preserve paragraph breaks
      enhancedContent = enhancedContent.replace(/\n{3,}/g, '\n\n');
      
      // Ensure sentences have proper spacing
      enhancedContent = enhancedContent.replace(/\.([A-Z])/g, '. $1');
      
      // Make sure bulleted lists have proper spacing
      enhancedContent = enhancedContent.replace(/\n-\s*/g, '\n- ');
    }
    
    const response = {
      result: enhancedContent,
      metadata: {
        source: result.metadata?.source || "backend-default",
        model: result.metadata?.model || "internal",
        processingTime: result.metadata?.processingTime || 0,
        success: true,
        enhancements: result.metadata?.enhancementTypes || [],
        method: enhancementMethod,
        llmError: llmError
      }
    };
    
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in engineer endpoint:', error);
    res.status(200).json({ 
      result: "I couldn't process that. Please try again.",
      error: error.message,
      metadata: {
        source: "error",
        processingTime: 0,
        success: false
      }
    });
  }
});

/**
 * Enhance multiple prompts in a batch
 * POST /api/enhance/batch
 * Request body: { prompts: string[] }
 * Response: { results: Array<EnhancementResult> }
 */
app.post(`${apiBasePath}/enhance/batch`, async (req, res) => {
  try {
    const { prompts } = req.body;
    
    if (!prompts || !Array.isArray(prompts)) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }
    
    const results = await enhancePromptBatch(prompts);
    res.status(200).json({ results });
  } catch (error) {
    console.error('Error enhancing prompts batch:', error);
    res.status(500).json({ 
      error: 'Error enhancing prompts batch',
      message: error.message
    });
  }
});

/**
 * Submit feedback for an enhancement
 * POST /api/feedback
 * Request body: { originalPrompt: string, enhancedPrompt: string, wasSuccessful: boolean, feedback?: string }
 * Response: { success: boolean }
 */
app.post(`${apiBasePath}/feedback`, async (req, res) => {
  try {
    const { originalPrompt, enhancedPrompt, wasSuccessful, feedback } = req.body;
    
    if (!originalPrompt || !enhancedPrompt || wasSuccessful === undefined) {
      return res.status(400).json({ error: 'originalPrompt, enhancedPrompt, and wasSuccessful are required' });
    }
    
    await learnFromFeedback(originalPrompt, enhancedPrompt, wasSuccessful, feedback);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ 
      error: 'Error submitting feedback',
      message: error.message
    });
  }
});

/**
 * Add training endpoint
 * POST /api/train
 * Request body: { filePath: string }
 * Response: { success: boolean, message: string }
 */
app.post(`${apiBasePath}/train`, (req, res) => {
  const { filePath } = req.body;
  
  if (!filePath) {
    return res.status(400).json({ error: 'Missing filePath parameter' });
  }
  
  const examplesProcessed = trainFromFile(filePath);
  
  return res.json({
    success: true,
    message: `Trained with ${examplesProcessed} examples`,
  });
});

/**
 * Add an endpoint to train from direct examples
 * POST /api/train/example
 * Request body: { original: string, enhanced: string, rating: number, ruleTypes?: string[] }
 * Response: { success: boolean, message: string }
 */
app.post(`${apiBasePath}/train/example`, (req, res) => {
  const { original, enhanced, rating, ruleTypes } = req.body;
  
  if (!original || !enhanced || !rating) {
    return res.status(400).json({ 
      error: 'Missing required parameters (original, enhanced, rating)' 
    });
  }
  
  // Learn from this example
  patternLearner.learnFromExample(original, enhanced, rating > 3);
  
  // Update rule weights
  if (ruleTypes && Array.isArray(ruleTypes)) {
    for (const ruleType of ruleTypes) {
      ruleWeightLearner.updateWeight(ruleType, rating);
    }
  }
  
  return res.json({
    success: true,
    message: 'Successfully learned from example'
  });
});

/**
 * Get current weights endpoint (useful for debugging)
 * GET /api/weights
 * Response: { success: boolean, weights?: Object, message?: string }
 */
app.get(`${apiBasePath}/weights`, (req, res) => {
  // Return the current state of weights
  const weightsPath = path.join(__dirname, './data/rule_weights.json');
  try {
    const weights = JSON.parse(fs.readFileSync(weightsPath, 'utf8'));
    return res.json({ success: true, weights });
  } catch (error) {
    return res.json({ 
      success: false, 
      message: 'No weights file found yet, using defaults'
    });
  }
});

/**
 * Engineer history endpoint - stores and retrieves prompt history
 * GET /api/engineer/history - Get history
 * POST /api/engineer/history - Store history item
 */
app.get(`${apiBasePath}/engineer/history`, async (req, res) => {
  try {
    // Get user identifier from request
    const userId = getUserIdentifier(req);
    
    // Get database connection
    const db = await getDb();
    
    // Query database for user's history - PostgreSQL version
    let historyItems = [];
    if (db) {
      try {
        const client = await db.connect();
        const result = await client.query(
          'SELECT * FROM history WHERE userid = $1 ORDER BY timestamp DESC',
          [userId]
        );
        client.release();
        historyItems = result.rows;
      } catch (dbError) {
        console.error('Error querying history for export:', dbError);
        // Continue with empty array
      }
    }
    
    // Return history items
    return res.status(200).json({ items: historyItems || [] });
  } catch (error) {
    console.error('Error retrieving history:', error);
    return res.status(200).json({ items: [], error: error.message });
  }
});

app.post(`${apiBasePath}/engineer/history`, async (req, res) => {
  try {
    const historyItem = req.body;
    
    // Validate history item
    if (!historyItem.original || !historyItem.refined) {
      return res.status(400).json({ error: 'Invalid history item' });
    }
    
    // Get user identifier from request
    const userId = getUserIdentifier(req);
    
    // Add user ID and timestamp to history item
    historyItem.userId = userId;
    historyItem.timestamp = historyItem.timestamp || new Date().toISOString();
    
    // Get database connection
    const db = await getDb();
    
    // If MongoDB is available, use it
    if (db) {
      try {
        // Insert history item into database - PostgreSQL version
        const client = await db.connect();
        await client.query(
          `INSERT INTO history 
           (userid, original, refined, context, timestamp, metadata) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            userId,
            historyItem.original,
            historyItem.refined,
            historyItem.context || null,
            new Date(historyItem.timestamp),
            historyItem.metadata ? JSON.stringify(historyItem.metadata) : null
          ]
        );
        client.release();
        console.log('Saved history item to PostgreSQL');
        
        // Return success
        return res.status(200).json({ success: true });
      } catch (dbError) {
        console.error('Error storing history item to PostgreSQL:', dbError);
        // Fall back to file-based storage on error
      }
    }
    
    // Fallback to file-based storage
    console.log('Using file-based storage for history');
    
    // Path to history file
    const historyPath = path.join(__dirname, './data/prompt_history.json');
    
    // Create directory if it doesn't exist
    const dataDir = path.join(__dirname, './data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize history data
    let historyData = { items: [] };
    
    // Read existing history if it exists
    if (fs.existsSync(historyPath)) {
      try {
        historyData = JSON.parse(fs.readFileSync(historyPath, 'utf8'));
      } catch (readError) {
        console.error('Error reading history file, creating new one:', readError);
      }
    }
    
    // Ensure items array exists
    if (!historyData.items) {
      historyData.items = [];
    }
    
    // Add new item to history
    historyData.items.unshift(historyItem);
    
    // Limit history size to 100 items
    if (historyData.items.length > 100) {
      historyData.items = historyData.items.slice(0, 100);
    }
    
    // Write history data to file
    fs.writeFileSync(historyPath, JSON.stringify(historyData, null, 2));
    console.log('Saved history item to file storage');
    
    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing history item:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Engineer feedback endpoint - handles feedback on prompt refinements
 * POST /api/engineer/feedback - Submit feedback
 */
app.post(`${apiBasePath}/engineer/feedback`, async (req, res) => {
  try {
    const { originalPrompt, enhancedPrompt, wasSuccessful, feedback } = req.body;
    
    if (!originalPrompt || !enhancedPrompt) {
      return res.status(400).json({ error: 'originalPrompt and enhancedPrompt are required' });
    }
    
    console.log(`Received feedback: ${wasSuccessful ? 'positive' : 'negative'}`, {
      originalLength: originalPrompt.length,
      enhancedLength: enhancedPrompt.length,
      hasFeedback: !!feedback
    });
    
    // Store feedback in a file
    const feedbackPath = path.join(__dirname, './data/user_feedback.json');
    
    // Create directory if it doesn't exist
    const dataDir = path.join(__dirname, './data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    // Initialize feedback data
    let feedbackData = { items: [] };
    
    // Read existing feedback if it exists
    if (fs.existsSync(feedbackPath)) {
      try {
        feedbackData = JSON.parse(fs.readFileSync(feedbackPath, 'utf8'));
      } catch (readError) {
        console.error('Error reading feedback file, creating new one:', readError);
      }
    }
    
    // Ensure items array exists
    if (!feedbackData.items) {
      feedbackData.items = [];
    }
    
    // Add new feedback item
    feedbackData.items.push({
      originalPrompt,
      enhancedPrompt,
      wasSuccessful,
      feedback,
      timestamp: new Date().toISOString()
    });
    
    // Write feedback data to file
    fs.writeFileSync(feedbackPath, JSON.stringify(feedbackData, null, 2));
    
    // Also try to learn from this feedback if possible
    try {
      await learnFromFeedback(originalPrompt, enhancedPrompt, wasSuccessful, feedback);
    } catch (learnError) {
      console.error('Error learning from feedback:', learnError);
      // Continue anyway - feedback is still stored
    }
    
    // Return success
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error storing feedback:', error);
    return res.status(200).json({ success: false, error: error.message });
  }
});

/**
 * Engineer export endpoint - exports prompt history in various formats
 * GET /api/engineer/export - Export history
 */
app.get(`${apiBasePath}/engineer/export`, async (req, res) => {
  try {
    // Get requested format
    const format = req.query.format || 'json';
    
    // Get user identifier from request
    const userId = getUserIdentifier(req);
    
    // Get database connection
    const db = await getDb();
    
    // Query database for user's history
    let historyItems = [];
    if (db) {
      try {
        const client = await db.connect();
        const result = await client.query(
          'SELECT * FROM history WHERE userid = $1 ORDER BY timestamp DESC',
          [userId]
        );
        client.release();
        historyItems = result.rows;
      } catch (dbError) {
        console.error('Error querying history for export:', dbError);
        // Continue with empty array
      }
    }
    
    if (format === 'csv') {
      // Set response headers for CSV
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="prompt-history.csv"');
      
      // Write CSV header
      res.write('Timestamp,Original,Refined,Context\n');
      
      // Process each history item
      if (historyItems && historyItems.length > 0) {
        historyItems.forEach(item => {
          // Sanitize fields for CSV (escape commas and quotes)
          const sanitize = (text) => {
            if (!text) return '';
            const sanitized = text.replace(/"/g, '""');
            return `"${sanitized}"`;
          };
          
          const timestamp = item.timestamp || new Date().toISOString();
          const original = sanitize(item.original);
          const refined = sanitize(item.refined);
          const context = sanitize(item.context);
          
          // Write CSV row
          res.write(`${timestamp},${original},${refined},${context}\n`);
        });
      }
      
      // End response
      return res.end();
    } else {
      // Default to JSON format
      return res.status(200).json({ items: historyItems });
    }
  } catch (error) {
    console.error('Error exporting history:', error);
    return res.status(500).json({ error: 'Error exporting history', message: error.message });
  }
});

// New endpoint to trigger learning pipeline manually
app.post(`${apiBasePath}/admin/learn`, async (req, res) => {
  try {
    const result = await runLearningPipeline();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Function to run the learning pipeline
async function runLearningPipeline() {
  console.log('Starting learning pipeline...');
  const startTime = Date.now();
  
  try {
    // Get database connection - import if needed
    const dbModule = require('./pgdb');
    const db = await dbModule.getDb();
    
    // If we're in fallback mode (no database), log and return early
    if (!db) {
      console.log('Database not available, skipping learning pipeline');
      return { 
        success: false, 
        message: 'Database not available, operating in fallback mode', 
        processedItems: 0 
      };
    }
    
    try {
      // Get unprocessed LLM enhancements - using PostgreSQL
      const client = await db.connect();
      const result = await client.query(
        'SELECT * FROM llm_enhancements WHERE learned = FALSE'
      );
      const unprocessedItems = result.rows;
      client.release();
      
      if (unprocessedItems.length === 0) {
        return { 
          success: true, 
          message: 'No new enhancements to learn from', 
          processedItems: 0 
        };
      }
      
      console.log(`Found ${unprocessedItems.length} unprocessed LLM enhancements to learn from`);
      
      // Extract examples for learning
      const examples = unprocessedItems.map(item => ({
        originalPrompt: item.originalprompt,
        enhancedPrompt: item.enhancedprompt,
        context: item.context
      }));
      
      // Learn patterns from examples
      try {
        await patternLearner.learnFromExamples(examples);
        console.log('Pattern learning complete');
      } catch (error) {
        console.error('Error in pattern learning:', error);
      }
      
      // Update rule weights if applicable
      try {
        await ruleWeightLearner.updateWeightsFromExamples(examples);
        console.log('Rule weight learning complete');
      } catch (error) {
        console.error('Error in rule weight learning:', error);
      }
      
      // Mark items as learned - using PostgreSQL
      const itemIds = unprocessedItems.map(item => item.id);
      const idsPlaceholders = itemIds.map((_, i) => `$${i + 1}`).join(',');
      
      const updateClient = await db.connect();
      const updateResult = await updateClient.query(
        `UPDATE llm_enhancements 
         SET learned = TRUE, learnedat = NOW() 
         WHERE id IN (${idsPlaceholders})`,
        itemIds
      );
      updateClient.release();
      
      const processingTime = Date.now() - startTime;
      console.log(`Learning pipeline complete. Processed ${unprocessedItems.length} items in ${processingTime}ms`);
      
      return {
        success: true,
        processedItems: unprocessedItems.length,
        processingTime
      };
    } catch (dbError) {
      console.error('Database error in learning pipeline:', dbError);
      return {
        success: false,
        message: `Database error: ${dbError.message}`,
        processedItems: 0
      };
    }
  } catch (error) {
    console.error('Error in runLearningPipeline:', error);
    return {
      success: false,
      message: 'Error in runLearningPipeline',
      processedItems: 0
    };
  }
}

// Setup automated learning pipeline to run periodically
function setupLearningSchedule() {
  // Run learning pipeline every 24 hours
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  
  async function scheduledLearning() {
    try {
      console.log('Running scheduled learning pipeline...');
      await runLearningPipeline();
      console.log('Scheduled learning complete');
    } catch (error) {
      console.error('Error in scheduled learning:', error);
    }
    
    // Schedule next run
    setTimeout(scheduledLearning, TWENTY_FOUR_HOURS);
  }
  
  // Initial run after 10 minutes of server startup
  setTimeout(scheduledLearning, 10 * 60 * 1000);
  console.log('Learning pipeline scheduled to run every 24 hours');
}

// Serve the frontend at the root path
app.get(`${basePath}`, (req, res) => {
  try {
    if (fs.existsSync(indexHtmlPath)) {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      
      // Replace any base path references if needed
      const processedHtml = basePath 
        ? indexHtml.replace(/<base href="\/"/g, `<base href="${basePath}/"`)
        : indexHtml;
      
      res.setHeader('Content-Type', 'text/html');
      res.send(processedHtml);
    } else {
      console.error('Index HTML file not found at:', indexHtmlPath);
      res.status(500).send('Frontend not built correctly. Check build process.');
    }
  } catch (error) {
    console.error('Error serving frontend:', error);
    res.status(500).json({ error: 'Error serving frontend', details: error.message });
  }
});

// Handle Next.js static files explicitly
app.get('/_next/*', (req, res) => {
  const filePath = path.join(__dirname, '../../frontend/.next', req.path);
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send('Static file not found');
  }
});

// Final catch-all route for client-side routing
app.get('*', (req, res) => {
  // Skip API routes 
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  try {
    if (fs.existsSync(indexHtmlPath)) {
      const indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.send(indexHtml);
    } else {
      res.status(404).send('Not found');
    }
  } catch (error) {
    console.error('Error in catch-all route:', error);
    res.status(500).json({ error: 'Error serving frontend' });
  }
});

// Initialize and start the server
async function startServer() {
  try {
    // Initialize the database connection
    console.log('Initializing database connection...');
    try {
      await initDatabase();
      console.log('Database initialization complete');
    } catch (dbError) {
      console.error('Database initialization failed, continuing with file-based storage:', dbError);
    }
    
    // Log LLM API status
    const externalApisEnabled = process.env.USE_EXTERNAL_APIS === 'true';
    const availableLLMs = externalApisEnabled ? getAvailableLLMs() : [];
    
    console.log('🌟 LLM API status:');
    console.log(`- External APIs enabled: ${externalApisEnabled ? 'YES' : 'NO'}`);
    if (externalApisEnabled) {
      console.log(`- Available LLMs: ${availableLLMs.length > 0 ? availableLLMs.join(', ') : 'NONE'}`);
      
      console.log('- API key status:');
      console.log(`  • DeepSeek: ${process.env.DEEPSEEK_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`  • Mistral: ${process.env.MISTRAL_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`  • Claude: ${process.env.CLAUDE_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
      console.log(`  • Gemini: ${process.env.GEMINI_API_KEY ? 'CONFIGURED' : 'MISSING'}`);
    }
    
    // Try to start the server
    console.log(`Attempting to start server on port ${port}...`);
    const server = await new Promise((resolve, reject) => {
      const s = app.listen(port, '0.0.0.0', () => {
        console.log(`✅ API server running on 0.0.0.0:${port}`);
        if (process.env.NODE_ENV !== 'production') {
          console.log(`🔄 Proxying frontend requests to Next.js on port ${NEXT_PORT}`);
        }
        console.log(`🌐 Base path: ${basePath || '/'}`);
        
        // Save the port to a file for other processes to know which port was used
        try {
          fs.writeFileSync(path.join(__dirname, '../.port'), port.toString());
          console.log(`💾 Port information saved to .port file`);
        } catch (err) {
          console.warn('Failed to save port information:', err);
        }
        
        // Log server address info
        const addr = s.address();
        console.log(`🔌 Server listening on ${addr.address}:${addr.port}`);
        resolve(s);
      });
      
      s.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`Port ${port} is already in use`);
          reject(error);
        } else {
          reject(error);
        }
      });
    });
    
    return server;
  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

// Export the app and startServer function
module.exports = { app, startServer };

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
} 