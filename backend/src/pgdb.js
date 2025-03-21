/**
 * PostgreSQL Database utility for connection and user identification
 * Replaces MongoDB for better compatibility with Render's environment
 */

const { Pool } = require('pg');
const crypto = require('crypto');

// Database connection pool
let pool = null;
let isInitialized = false;

/**
 * Initialize the database connection and create tables if needed
 */
async function initDatabase() {
  try {
    // Get PostgreSQL connection string from environment variables
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      console.error('No DATABASE_URL environment variable found');
      console.log('Falling back to in-memory operation');
      return null;
    }
    
    console.log('Connecting to PostgreSQL...');
    
    // Create connection pool
    pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Render's PostgreSQL
      }
    });
    
    // Test connection
    const client = await pool.connect();
    console.log('Connected to PostgreSQL successfully');
    
    // Create tables if they don't exist
    await createTables(client);
    
    // Release client back to pool
    client.release();
    
    isInitialized = true;
    return pool;
  } catch (error) {
    console.error('Failed to connect to PostgreSQL database:', error);
    console.log('Falling back to in-memory operation');
    return null;
  }
}

/**
 * Create database tables if they don't exist
 */
async function createTables(client) {
  try {
    // Create history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS history (
        id SERIAL PRIMARY KEY,
        userId VARCHAR(255) NOT NULL,
        original TEXT NOT NULL,
        refined TEXT NOT NULL,
        context TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB
      );
    `);
    
    // Create LLM enhancements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS llm_enhancements (
        id SERIAL PRIMARY KEY,
        originalPrompt TEXT NOT NULL,
        enhancedPrompt TEXT NOT NULL,
        context TEXT,
        source VARCHAR(50),
        model VARCHAR(50),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        learned BOOLEAN DEFAULT FALSE,
        learnedAt TIMESTAMP
      );
    `);
    
    // Create feedback table
    await client.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        originalPrompt TEXT NOT NULL,
        enhancedPrompt TEXT NOT NULL,
        wasSuccessful BOOLEAN NOT NULL,
        feedback TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_history_userId ON history(userId);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_llm_learned ON llm_enhancements(learned);`);
    
    console.log('Database tables created/verified');
  } catch (error) {
    console.error('Error creating database tables:', error);
    throw error;
  }
}

/**
 * PostgreSQL specific functions to mimic MongoDB collection API
 */
const dbHelpers = {
  /**
   * Get the "collection" (table)
   */
  collection: function(tableName) {
    if (!pool) {
      throw new Error('Database not initialized');
    }
    
    return {
      // Find documents matching query
      find: async function(query = {}) {
        try {
          let sqlQuery = `SELECT * FROM ${tableName}`;
          const values = [];
          
          // Convert MongoDB-style query to SQL WHERE clause
          if (Object.keys(query).length > 0) {
            const whereClauses = [];
            let paramCounter = 1;
            
            for (const [key, value] of Object.entries(query)) {
              if (value === false) {
                whereClauses.push(`${key} = FALSE`);
              } else if (value === true) {
                whereClauses.push(`${key} = TRUE`);
              } else if (typeof value === 'object' && value !== null) {
                if (value.$in && Array.isArray(value.$in)) {
                  whereClauses.push(`${key} = ANY($${paramCounter})`);
                  values.push(value.$in);
                  paramCounter++;
                }
              } else {
                whereClauses.push(`${key} = $${paramCounter}`);
                values.push(value);
                paramCounter++;
              }
            }
            
            if (whereClauses.length > 0) {
              sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
            }
          }
          
          const client = await pool.connect();
          const result = await client.query(sqlQuery, values);
          client.release();
          
          return {
            // Convert normal SQL query result to MongoDB-style cursor with toArray
            toArray: async function() {
              return result.rows;
            }
          };
        } catch (error) {
          console.error(`Error in find query for ${tableName}:`, error);
          throw error;
        }
      },
      
      // Insert a document
      insertOne: async function(doc) {
        try {
          const keys = Object.keys(doc);
          const values = Object.values(doc);
          const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
          
          const sqlQuery = `
            INSERT INTO ${tableName} (${keys.join(', ')})
            VALUES (${placeholders})
            RETURNING *;
          `;
          
          const client = await pool.connect();
          const result = await client.query(sqlQuery, values);
          client.release();
          
          return { 
            insertedId: result.rows[0].id,
            acknowledged: true 
          };
        } catch (error) {
          console.error(`Error in insertOne for ${tableName}:`, error);
          throw error;
        }
      },
      
      // Update multiple documents
      updateMany: async function(filter, update) {
        try {
          // Extract the $set operator
          if (!update.$set) {
            throw new Error('Only $set operator is supported');
          }
          
          const updateSet = update.$set;
          const updateKeys = Object.keys(updateSet);
          const updateValues = Object.values(updateSet);
          
          // Build SET part of query
          const setClause = updateKeys
            .map((key, i) => `${key} = $${i + 1}`)
            .join(', ');
          
          // Build WHERE clause
          let whereClause = '';
          let paramOffset = updateValues.length + 1;
          
          if (filter._id && filter._id.$in) {
            whereClause = `id = ANY($${paramOffset})`;
            updateValues.push(filter._id.$in);
          } else {
            const filterKeys = Object.keys(filter);
            whereClause = filterKeys
              .map((key, i) => `${key} = $${i + paramOffset}`)
              .join(' AND ');
            
            filterKeys.forEach(key => updateValues.push(filter[key]));
          }
          
          const sqlQuery = `
            UPDATE ${tableName}
            SET ${setClause}
            WHERE ${whereClause}
            RETURNING *;
          `;
          
          const client = await pool.connect();
          const result = await client.query(sqlQuery, updateValues);
          client.release();
          
          return {
            modifiedCount: result.rowCount,
            matchedCount: result.rowCount
          };
        } catch (error) {
          console.error(`Error in updateMany for ${tableName}:`, error);
          throw error;
        }
      },
      
      // Count documents matching query
      countDocuments: async function(query = {}) {
        try {
          let sqlQuery = `SELECT COUNT(*) FROM ${tableName}`;
          const values = [];
          
          // Convert MongoDB-style query to SQL WHERE clause
          if (Object.keys(query).length > 0) {
            const whereClauses = [];
            let paramCounter = 1;
            
            for (const [key, value] of Object.entries(query)) {
              if (value === false) {
                whereClauses.push(`${key} = FALSE`);
              } else if (value === true) {
                whereClauses.push(`${key} = TRUE`);
              } else {
                whereClauses.push(`${key} = $${paramCounter}`);
                values.push(value);
                paramCounter++;
              }
            }
            
            if (whereClauses.length > 0) {
              sqlQuery += ` WHERE ${whereClauses.join(' AND ')}`;
            }
          }
          
          const client = await pool.connect();
          const result = await client.query(sqlQuery, values);
          client.release();
          
          return parseInt(result.rows[0].count, 10);
        } catch (error) {
          console.error(`Error in countDocuments for ${tableName}:`, error);
          throw error;
        }
      },
      
      // Create an index (no-op in PostgreSQL, we create indexes at table creation)
      createIndex: async function() {
        return { acknowledged: true };
      },
      
      // Aggregate function (minimal implementation for dashboard use)
      aggregate: function(pipeline) {
        return {
          toArray: async function() {
            try {
              // Very simplified aggregation support for the dashboard
              // We'll handle just the common cases used in the API
              
              if (pipeline.length === 1 && pipeline[0].$group) {
                // Simple grouping
                const group = pipeline[0].$group;
                const idField = typeof group._id === 'string' ? group._id : 'value';
                
                // Simple count with grouping
                const countField = Object.keys(group).find(key => key !== '_id');
                
                let sqlQuery;
                if (idField === 'metadata.source') {
                  // Special case for JSON field
                  sqlQuery = `
                    SELECT metadata->>'source' as id, COUNT(*) as count
                    FROM ${tableName}
                    GROUP BY metadata->>'source'
                  `;
                } else {
                  sqlQuery = `
                    SELECT ${idField} as id, COUNT(*) as count
                    FROM ${tableName}
                    GROUP BY ${idField}
                  `;
                }
                
                const client = await pool.connect();
                const result = await client.query(sqlQuery);
                client.release();
                
                // Transform result to match MongoDB aggregation output
                return result.rows.map(row => ({
                  _id: row.id,
                  count: parseInt(row.count, 10)
                }));
              }
              
              // Default empty result for unsupported operations
              return [];
            } catch (error) {
              console.error(`Error in aggregate for ${tableName}:`, error);
              throw error;
            }
          }
        };
      }
    };
  }
};

/**
 * Get the database instance with MongoDB-like interface
 */
async function getDb() {
  if (!isInitialized) {
    try {
      await initDatabase();
    } catch (error) {
      console.error('Error initializing database:', error);
      return null;
    }
  }
  
  if (!pool) {
    return null;
  }
  
  return dbHelpers;
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