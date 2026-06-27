require('dotenv').config();
const nombaService = require('./src/services/nomba.service');

async function test() {
  const success = await nombaService.authenticate();
  if (success) {
    console.log('✅ Handshake Test Passed: Successfully authenticated with Nomba Sandbox!');
    console.log('Access Token obtained:', nombaService.getAccessToken().substring(0, 15) + '...');
  } else {
    console.error('❌ Handshake Test Failed.');
    process.exit(1);
  }
}

test();
