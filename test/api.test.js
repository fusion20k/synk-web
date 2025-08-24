// Simple API tests for Synk
// Run with: node test/api.test.js

const http = require('http');

const BASE_URL = 'http://localhost:3000';

// Simple HTTP request helper
function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
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

// Test functions
async function testHealthCheck() {
  console.log('Testing health check...');
  try {
    const response = await makeRequest('/health');
    if (response.status === 200) {
      console.log('✅ Health check passed');
      console.log('   Response:', response.data);
    } else {
      console.log('❌ Health check failed');
      console.log('   Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Health check error:', error.message);
  }
}

async function testRootEndpoint() {
  console.log('Testing root endpoint...');
  try {
    const response = await makeRequest('/');
    if (response.status === 200) {
      console.log('✅ Root endpoint passed');
      console.log('   Message:', response.data.message);
    } else {
      console.log('❌ Root endpoint failed');
      console.log('   Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Root endpoint error:', error.message);
  }
}

async function testSyncStatus() {
  console.log('Testing sync status with dummy user...');
  try {
    const response = await makeRequest('/sync/status/test-user-id');
    console.log('📊 Sync status response (expected 404):');
    console.log('   Status:', response.status);
    console.log('   Data:', response.data);
  } catch (error) {
    console.log('❌ Sync status error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting Synk API Tests\n');
  
  await testHealthCheck();
  console.log('');
  
  await testRootEndpoint();
  console.log('');
  
  await testSyncStatus();
  console.log('');
  
  console.log('🏁 Tests completed');
}

// Check if server is running
async function checkServer() {
  try {
    await makeRequest('/health');
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function main() {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('❌ Server is not running on http://localhost:3000');
    console.log('   Please start the server with: npm start');
    process.exit(1);
  }
  
  await runTests();
}

main().catch(console.error);