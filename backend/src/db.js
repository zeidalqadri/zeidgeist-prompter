/**
 * Database utility for MongoDB connection and user identification
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');

// MongoDB connection variables
let client = null;
let db = null;

/**
 * Initialize the database connection
 */
async function initDatabase() {
  try {
    // Get MongoDB connection string from environment variables
    let mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/promptEnhancer';
    
    // Add required SSL parameters directly to the connection string
    // This avoids SSL configuration issues in the MongoClient options
    if (mongoUri.includes('mongodb+srv://') && !mongoUri.includes('retryWrites=')) {
      const separator = mongoUri.includes('?') ? '&' : '?';
      mongoUri = `${mongoUri}${separator}retryWrites=true&w=majority&tls=true`;
    }
    
    console.log('Connecting to MongoDB with URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Log URI with hidden credentials
    
    // IMPORTANT: Using a minimal set of options with no SSL configurations
    // Let the URI handle all SSL settings to avoid conflicts
    client = new MongoClient(mongoUri, {
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 60000
    });
    
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    db = client.db();
    
    // Create indexes for collections
    try {
      await db.collection('history').createIndex({ userId: 1 });
      console.log('Created index on history collection');
    } catch (indexError) {
      console.error('Error creating index:', indexError);
      // Continue even if index creation fails
    }
    
    return db;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    
    // Fall back to in-memory operation if database connection fails
    console.log('Falling back to in-memory operation');
    
    // Return null for db to indicate fallback mode
    return null;
  }
}

/**
 * Get the database instance
 */
async function getDb() {
  if (!db) {
    try {
      db = await initDatabase();
    } catch (error) {
      console.error('Error getting database connection:', error);
    }
  }
  return db;
}

/**
 * Extract IP address from request
 */
function getClientIp(req) {
  return req.headers['x-forwarded-for'] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null);
}

/**
 * Generate device hash from request headers
 */
function generateDeviceHash(req) {
  const deviceInfo = `${req.headers['user-agent'] || ''}-${req.headers['accept-language'] || ''}`;
  return crypto.createHash('sha256').update(deviceInfo).digest('hex');
}

/**
 * Get or create user identifier from request
 */
function getUserIdentifier(req) {
  const ip = getClientIp(req) || 'unknown-ip';
  const deviceHash = generateDeviceHash(req);
  return `${ip}-${deviceHash}`;
}

module.exports = {
  initDatabase,
  getDb,
  getClientIp,
  generateDeviceHash,
  getUserIdentifier
}; 