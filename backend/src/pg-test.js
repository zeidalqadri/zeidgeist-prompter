/**
 * PostgreSQL connection test script
 * Run this to verify connection to Render's PostgreSQL database
 */

const { Pool } = require('pg');

// Database connection information
const connectionString = 'postgresql://zeidgeistdotcom_pg_user:m5Xx5CNBh0RtBo63N4zLvcVivQ8AmjKa@dpg-cveft2t2ng1s73cfuir0-a/zeidgeistdotcom_pg';

async function testConnection() {
  console.log('Testing PostgreSQL connection...');
  
  try {
    // Create connection pool
    const pool = new Pool({
      connectionString,
      ssl: {
        rejectUnauthorized: false // Required for Render's PostgreSQL
      }
    });
    
    // Test connection
    const client = await pool.connect();
    console.log('✅ Successfully connected to PostgreSQL!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time');
    console.log(`✅ Successfully executed query! Current time: ${result.rows[0].current_time}`);
    
    // Create a test table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS connection_test (
          id SERIAL PRIMARY KEY,
          test_message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✅ Successfully created test table!');
      
      // Insert test data
      const insertResult = await client.query(`
        INSERT INTO connection_test (test_message) VALUES ($1) RETURNING *
      `, ['Connection test from Render deployment']);
      
      console.log('✅ Successfully inserted test data:', insertResult.rows[0]);
      
      // Query test data
      const testData = await client.query('SELECT * FROM connection_test ORDER BY created_at DESC LIMIT 5');
      console.log('✅ Recent test records:');
      testData.rows.forEach(row => {
        console.log(`- ID ${row.id}: "${row.test_message}" (${row.created_at})`);
      });
    } catch (tableError) {
      console.error('❌ Error with test table operations:', tableError);
    }
    
    // Release client back to pool
    client.release();
    console.log('✅ Connection test complete and successful!');
  } catch (error) {
    console.error('❌ Connection failed!', error);
  }
}

// Run the test
testConnection(); 