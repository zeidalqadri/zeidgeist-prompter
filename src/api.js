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
const { enhancePrompt, enhancePromptBatch, learnFromFeedback } = require('./prompt-enhancer');
const { trainFromFile } = require('./training/batchTrainer');
const patternLearner = require('./learning/patternLearner');
const ruleWeightLearner = require('./learning/ruleWeightLearner');
const net = require('net');

// Create Express app
const app = express();
const DEFAULT_PORT = process.env.PORT || 8081;
const NEXT_PORT = process.env.NEXT_PORT || 3000;

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

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from the Next.js export
app.use(express.static(path.join(__dirname, '../frontend')));

// API endpoints

// API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', version: '0.1.0' });
});

/**
 * Enhance a single prompt
 * POST /api/enhance
 * Request body: { prompt: string, context?: string }
 * Response: { enhancedPrompt: string, wasEnhanced: boolean, enhancements: Array, metadata: Object }
 */
app.post('/api/enhance', async (req, res) => {
  try {
    const { prompt, context } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    
    const result = await enhancePrompt(prompt, context || '');
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
 * Enhance multiple prompts in a batch
 * POST /api/enhance/batch
 * Request body: { prompts: string[] }
 * Response: { results: Array<EnhancementResult> }
 */
app.post('/api/enhance/batch', async (req, res) => {
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
app.post('/api/feedback', async (req, res) => {
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
app.post('/api/train', (req, res) => {
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
app.post('/api/train/example', (req, res) => {
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
app.get('/api/weights', (req, res) => {
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

// Proxy all non-API requests to Next.js
app.use('/', createProxyMiddleware({
  target: `http://localhost:${NEXT_PORT}`,
  changeOrigin: true,
  ws: true,
  pathRewrite: {
    '^/api/engineer/': '/api/engineer/', // preserve Next.js API routes
    '^/api/': '/api/' // preserve our API routes
  }
}));

/**
 * Start the server with automatic port discovery
 */
async function startServer() {
  try {
    // Try the default port first
    const inUse = await isPortInUse(DEFAULT_PORT);
    
    if (inUse) {
      console.log(`Default port ${DEFAULT_PORT} is already in use, finding an available port...`);
      const availablePort = await findAvailablePort(DEFAULT_PORT + 1);
      
      app.listen(availablePort, () => {
        console.log(`⚠️ Default port ${DEFAULT_PORT} was in use!`);
        console.log(`✅ API server running on port ${availablePort}`);
        console.log(`🔄 Proxying frontend requests to Next.js on port ${NEXT_PORT}`);
        
        // Save the port to a file for other processes to know which port was used
        try {
          fs.writeFileSync(path.join(__dirname, '../.port'), availablePort.toString());
          console.log(`💾 Port information saved to .port file`);
        } catch (err) {
          console.warn('Failed to save port information:', err);
        }
      });
    } else {
      // Use the default port
      app.listen(DEFAULT_PORT, () => {
        console.log(`✅ API server running on port ${DEFAULT_PORT}`);
        console.log(`🔄 Proxying frontend requests to Next.js on port ${NEXT_PORT}`);
        
        // Save the port to a file for other processes to know which port was used
        try {
          fs.writeFileSync(path.join(__dirname, '../.port'), DEFAULT_PORT.toString());
          console.log(`💾 Port information saved to .port file`);
        } catch (err) {
          console.warn('Failed to save port information:', err);
        }
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// If this file is run directly, start the server
if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer
}; 