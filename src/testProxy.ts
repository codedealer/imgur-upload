import { axiosClient } from './axiosClient';
import config from './config';

async function testProxy() {
  console.log('Testing Imgur Proxy Configuration...\n');

  if (!config.gcProxy) {
    console.log('❌ GC_PROXY environment variable not set');
    console.log('To use the proxy, set: GC_PROXY=https://your-service-url.run.app');
    console.log('Current mode: Direct API calls to Imgur');
    return;
  }

  console.log(`✅ GC_PROXY configured: ${config.gcProxy}`);
  console.log('Current mode: Proxy requests through Cloud Run\n');

  try {
    console.log('Testing proxy health check...');
    const healthResponse = await axiosClient.get(`${config.gcProxy}/health`);
    console.log('✅ Proxy health check passed');
    console.log('Response:', JSON.stringify(healthResponse.data, null, 2));
  } catch (error: any) {
    console.log('❌ Proxy health check failed');
    console.log('Error:', error.message);
    if (error.response?.status) {
      console.log('Status:', error.response.status);
      console.log('Response:', error.response.data);
    }
  }

  console.log('\nProxy configuration test completed.');
}

if (require.main === module) {
  testProxy().catch(console.error);
}

export { testProxy };
