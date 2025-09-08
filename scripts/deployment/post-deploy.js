#!/usr/bin/env node

/**
 * Post-deployment validation and setup script
 * Validates deployment health and runs post-deployment tasks
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    const req = client.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 30000,
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = res.headers['content-type']?.includes('application/json') ? 
            JSON.parse(data) : data;
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (error) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });
    
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (options.body) {
      req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function checkHealthEndpoint(baseUrl) {
  console.log('🏥 Checking health endpoints...');
  
  const endpoints = [
    { path: '/api/health/liveness', name: 'Liveness', required: true },
    { path: '/api/health/readiness', name: 'Readiness', required: true },
    { path: '/api/health', name: 'Full Health', required: false },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint.path}`;
      console.log(`   Checking ${endpoint.name}: ${url}`);
      
      const response = await makeRequest(url, { timeout: 10000 });
      
      if (response.status === 200) {
        console.log(`   ✅ ${endpoint.name} check passed`);
        if (endpoint.path === '/api/health' && response.data) {
          console.log(`      Status: ${response.data.status}`);
          console.log(`      Healthy checks: ${response.data.summary?.healthy || 'unknown'}`);
        }
      } else {
        const message = `${endpoint.name} check failed with status ${response.status}`;
        if (endpoint.required) {
          throw new Error(message);
        } else {
          console.warn(`   ⚠️  ${message} (non-critical)`);
        }
      }
    } catch (error) {
      const message = `${endpoint.name} check failed: ${error.message}`;
      if (endpoint.required) {
        throw new Error(message);
      } else {
        console.warn(`   ⚠️  ${message} (non-critical)`);
      }
    }
  }
  
  console.log('✅ Health check validation completed');
}

async function validateApiEndpoints(baseUrl) {
  console.log('🔌 Validating critical API endpoints...');
  
  const endpoints = [
    { 
      path: '/api/engineer', 
      method: 'POST',
      name: 'Prompt Enhancement',
      body: { prompt: 'test deployment validation' }
    },
    {
      path: '/api/engineer/history-dual-mode',
      method: 'GET', 
      name: 'History API',
    },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const url = `${baseUrl}${endpoint.path}`;
      console.log(`   Testing ${endpoint.name}: ${endpoint.method} ${url}`);
      
      const response = await makeRequest(url, {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'deployment-validation/1.0'
        },
        body: endpoint.body,
        timeout: 15000
      });
      
      if (response.status >= 200 && response.status < 300) {
        console.log(`   ✅ ${endpoint.name} endpoint functional`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`   ✅ ${endpoint.name} endpoint responding (auth required as expected)`);
      } else {
        console.warn(`   ⚠️  ${endpoint.name} returned status ${response.status}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  ${endpoint.name} test failed: ${error.message}`);
    }
  }
  
  console.log('✅ API endpoint validation completed');
}

async function checkStaticAssets(baseUrl) {
  console.log('📁 Checking static asset delivery...');
  
  const assets = [
    { path: '/', name: 'Homepage', expectType: 'text/html' },
    { path: '/favicon.ico', name: 'Favicon', expectType: 'image/' },
  ];
  
  for (const asset of assets) {
    try {
      const url = `${baseUrl}${asset.path}`;
      const response = await makeRequest(url, { timeout: 10000 });
      
      if (response.status === 200) {
        const contentType = response.headers['content-type'] || '';
        if (asset.expectType && !contentType.includes(asset.expectType)) {
          console.warn(`   ⚠️  ${asset.name} has unexpected content type: ${contentType}`);
        } else {
          console.log(`   ✅ ${asset.name} loading correctly`);
        }
      } else {
        console.warn(`   ⚠️  ${asset.name} returned status ${response.status}`);
      }
    } catch (error) {
      console.warn(`   ⚠️  ${asset.name} check failed: ${error.message}`);
    }
  }
  
  console.log('✅ Static asset check completed');
}

async function performLoadTest(baseUrl) {
  console.log('⚡ Performing basic load test...');
  
  const concurrentRequests = 10;
  const testUrl = `${baseUrl}/api/health/liveness`;
  
  console.log(`   Testing ${concurrentRequests} concurrent requests to ${testUrl}`);
  
  const startTime = Date.now();
  const promises = Array(concurrentRequests).fill().map(async (_, i) => {
    try {
      const response = await makeRequest(testUrl, { timeout: 5000 });
      return { index: i, status: response.status, success: response.status === 200 };
    } catch (error) {
      return { index: i, status: 'error', success: false, error: error.message };
    }
  });
  
  const results = await Promise.all(promises);
  const duration = Date.now() - startTime;
  const successful = results.filter(r => r.success).length;
  const failed = results.length - successful;
  
  console.log(`   Results: ${successful}/${results.length} successful in ${duration}ms`);
  console.log(`   Average response time: ${(duration / results.length).toFixed(2)}ms`);
  
  if (failed > results.length * 0.1) { // More than 10% failure rate
    console.warn(`   ⚠️  High failure rate: ${failed}/${results.length} requests failed`);
  } else {
    console.log('   ✅ Load test passed');
  }
  
  console.log('✅ Load test completed');
}

async function validateDeploymentInfo(baseUrl) {
  console.log('📋 Validating deployment information...');
  
  try {
    const response = await makeRequest(`${baseUrl}/deployment-info.json`);
    
    if (response.status === 200 && response.data) {
      const info = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      console.log('   ✅ Deployment info available:');
      console.log(`      Environment: ${info.environment}`);
      console.log(`      Version: ${info.version}`);
      console.log(`      Build: ${info.buildNumber}`);
      console.log(`      Deployed: ${info.timestamp}`);
    } else {
      console.warn('   ⚠️  Deployment info not available (non-critical)');
    }
  } catch (error) {
    console.warn(`   ⚠️  Could not fetch deployment info: ${error.message}`);
  }
}

async function runSmokeTests(baseUrl) {
  console.log('💨 Running smoke tests...');
  
  // Basic smoke test - try to enhance a prompt
  try {
    const testPrompt = "Make this better";
    const response = await makeRequest(`${baseUrl}/api/engineer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { prompt: testPrompt },
      timeout: 30000
    });
    
    if (response.status === 200 && response.data?.enhancedPrompt) {
      console.log('   ✅ Prompt enhancement working');
    } else if (response.status === 401) {
      console.log('   ✅ API authentication working (unauthorized as expected)');
    } else {
      console.warn(`   ⚠️  Unexpected response: ${response.status}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  Smoke test failed: ${error.message}`);
  }
  
  console.log('✅ Smoke tests completed');
}

async function main() {
  const startTime = Date.now();
  
  // Get deployment URL from environment or command line
  const deploymentUrl = process.env.DEPLOYMENT_URL || 
                       process.argv[2] || 
                       'https://mstprmpt.zeidgeist.com';
  
  if (!deploymentUrl.startsWith('http')) {
    console.error('❌ Invalid deployment URL. Please provide a valid HTTP/HTTPS URL.');
    process.exit(1);
  }
  
  try {
    console.log('🚀 Starting post-deployment validation...');
    console.log(`🌐 Target URL: ${deploymentUrl}\n`);
    
    // Wait a moment for deployment to settle
    console.log('⏳ Waiting for deployment to settle...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    await checkHealthEndpoint(deploymentUrl);
    await validateApiEndpoints(deploymentUrl);
    await checkStaticAssets(deploymentUrl);
    await validateDeploymentInfo(deploymentUrl);
    await performLoadTest(deploymentUrl);
    await runSmokeTests(deploymentUrl);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ Post-deployment validation completed successfully!');
    console.log(`   Duration: ${duration}s`);
    console.log(`   Deployment URL: ${deploymentUrl}`);
    console.log('   Application is live and healthy! 🎉');
    
    // Set output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 
        `deployment_url=${deploymentUrl}\nvalidation_status=success\n`);
    }
    
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.error(`\n❌ Post-deployment validation failed after ${duration}s`);
    console.error(`   Error: ${error.message}`);
    console.error('   Manual investigation may be required.');
    
    // Set output for GitHub Actions
    if (process.env.GITHUB_OUTPUT) {
      require('fs').appendFileSync(process.env.GITHUB_OUTPUT, 
        `validation_status=failed\nerror=${error.message}\n`);
    }
    
    process.exit(1);
  }
}

main();