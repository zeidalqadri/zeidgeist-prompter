/**
 * Test script for user identification
 * 
 * This script tests the user identification functionality by simulating
 * requests from different users and verifying that each user only sees
 * their own history.
 */

const http = require('http');
const { getUserIdentifier } = require('../db');

// Mock request objects for different users
const mockUserA = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'accept-language': 'en-US,en;q=0.9',
    'x-forwarded-for': '192.168.1.1'
  },
  connection: { remoteAddress: '192.168.1.1' }
};

const mockUserB = {
  headers: {
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'accept-language': 'en-GB,en;q=0.8',
    'x-forwarded-for': '192.168.1.2'
  },
  connection: { remoteAddress: '192.168.1.2' }
};

// Test user identification function
function testUserIdentification() {
  const userAId = getUserIdentifier(mockUserA);
  const userBId = getUserIdentifier(mockUserB);
  
  console.log('User A ID:', userAId);
  console.log('User B ID:', userBId);
  
  if (userAId === userBId) {
    console.error('ERROR: Both users have the same ID!');
  } else {
    console.log('SUCCESS: Users have different IDs.');
  }
}

// Function to make a request to the API
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = JSON.parse(responseData);
          resolve({ statusCode: res.statusCode, data: parsedData });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test API endpoints with user identification
async function testApi() {
  const port = process.env.PORT || 8081;
  const baseUrl = `http://localhost:${port}`;
  
  try {
    // Test user A: Save history item
    const userAOptions = {
      hostname: 'localhost',
      port,
      path: '/api/engineer/history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...mockUserA.headers
      }
    };
    
    const userAHistoryItem = {
      original: 'Test prompt from User A',
      refined: 'Enhanced test prompt from User A',
      timestamp: new Date().toISOString()
    };
    
    console.log('Saving history item for User A...');
    await makeRequest(userAOptions, userAHistoryItem);
    
    // Test user B: Save history item
    const userBOptions = {
      hostname: 'localhost',
      port,
      path: '/api/engineer/history',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...mockUserB.headers
      }
    };
    
    const userBHistoryItem = {
      original: 'Test prompt from User B',
      refined: 'Enhanced test prompt from User B',
      timestamp: new Date().toISOString()
    };
    
    console.log('Saving history item for User B...');
    await makeRequest(userBOptions, userBHistoryItem);
    
    // Retrieve history for User A
    userAOptions.method = 'GET';
    console.log('Retrieving history for User A...');
    const userAHistory = await makeRequest(userAOptions);
    
    // Retrieve history for User B
    userBOptions.method = 'GET';
    console.log('Retrieving history for User B...');
    const userBHistory = await makeRequest(userBOptions);
    
    // Verify each user only sees their own history
    console.log('User A history items:', userAHistory.data.items.length);
    console.log('User B history items:', userBHistory.data.items.length);
    
    let userASeesOnlyTheirPrompt = true;
    let userBSeesOnlyTheirPrompt = true;
    
    // Check User A history
    for (const item of userAHistory.data.items) {
      if (item.original.includes('User B')) {
        userASeesOnlyTheirPrompt = false;
        console.error('ERROR: User A can see User B history!');
        break;
      }
    }
    
    // Check User B history
    for (const item of userBHistory.data.items) {
      if (item.original.includes('User A')) {
        userBSeesOnlyTheirPrompt = false;
        console.error('ERROR: User B can see User A history!');
        break;
      }
    }
    
    if (userASeesOnlyTheirPrompt && userBSeesOnlyTheirPrompt) {
      console.log('SUCCESS: Each user only sees their own history items!');
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run tests
console.log('Running user identification tests...');
testUserIdentification();

console.log('\nRunning API tests (make sure the server is running)...');
testApi().then(() => {
  console.log('Tests completed.');
}); 