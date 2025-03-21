/**
 * Database utility for MongoDB connection and user identification
 */

const { MongoClient, ServerApiVersion } = require('mongodb');
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
    
    // Append SSL parameters directly to the URI instead of in the options
    if (mongoUri.includes('mongodb+srv://')) {
      // Parse the URI to extract any existing database name
      const dbName = mongoUri.split('/').pop().split('?')[0] || 'promptEnhancer';
      
      // Remove any existing query parameters and add our own comprehensive set
      mongoUri = mongoUri.split('?')[0];
      mongoUri = `${mongoUri}/${dbName}?retryWrites=true&w=majority&ssl=true&tls=true&tlsAllowInvalidCertificates=true&tlsInsecure=true&authSource=admin`;
    }
    
    console.log('Connecting to MongoDB with URI:', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@')); // Log URI with hidden credentials
    
    // Use minimal options - put everything in the connection string instead
    client = new MongoClient(mongoUri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: false, // Set to false to be more lenient
        deprecationErrors: false // Set to false to avoid additional errors
      },
      connectTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      serverSelectionTimeoutMS: 60000,
      maxPoolSize: 10,
      minPoolSize: 0 // Starting with 0 to allow more flexibility
    });
    
    await client.connect();
    console.log('Connected to MongoDB successfully');
    
    // Explicitly get the database, don't rely on connection string parsing
    const dbName = process.env.MONGODB_DB_NAME || mongoUri.split('/').pop().split('?')[0] || 'promptEnhancer';
    db = client.db(dbName);
    console.log(`Using database: ${dbName}`);
    
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