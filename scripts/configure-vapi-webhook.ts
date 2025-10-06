// scripts/configure-vapi-webhook.ts
// Configure VAPI assistant to send webhook authentication

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SHARED_SECRET;
const ASSISTANT_ID = process.argv[2] || '9d1b9795-6a7b-49e7-8c68-ce45895338c3';
const WEBHOOK_URL = 'https://autorev-voice-saas1.vercel.app/api/vapi/webhook';

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in environment');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('❌ WEBHOOK_SHARED_SECRET not found in environment');
  process.exit(1);
}

async function configureWebhook() {
  console.log('🔄 Configuring VAPI webhook authentication...');
  console.log('   Assistant ID:', ASSISTANT_ID);
  console.log('   Webhook URL:', WEBHOOK_URL);
  console.log('   Secret:', WEBHOOK_SECRET.substring(0, 8) + '...');
  console.log('');

  // Update assistant with server URL and secret
  const response = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      serverUrl: WEBHOOK_URL,
      serverUrlSecret: WEBHOOK_SECRET
    })
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('❌ Failed to configure webhook:', error);
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Webhook configured successfully!');
  console.log('');
  console.log('📋 Configuration:');
  console.log('   Server URL:', result.serverUrl || 'NOT SET');
  console.log('   Secret configured:', !!result.serverUrlSecret);
  console.log('');
  console.log('🧪 Next steps:');
  console.log('   1. Make a test call to +17402403270');
  console.log('   2. Check Vercel logs for webhook events');
  console.log('   3. Verify database records are created');
}

configureWebhook().catch(console.error);
