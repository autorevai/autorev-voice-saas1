// scripts/fix-test8-assistant.ts
// Fix Test 8 assistant to have tools and server authentication

const VAPI_API_KEY = process.env.VAPI_API_KEY;
const WEBHOOK_SECRET = process.env.WEBHOOK_SHARED_SECRET;
const ASSISTANT_ID = '9d1b9795-6a7b-49e7-8c68-ce45895338c3'; // Test 8 HVAC
const WEBHOOK_URL = 'https://autorev-voice-saas1.vercel.app/api/vapi/webhook';

const TOOL_IDS = [
  '6ec7dfc4-c44a-4b13-b1cc-409d192c6355', // create_booking
  '1017d954-0a78-4099-abd9-d85ea9551aca', // quote_estimate
  '0dcefa2c-3c13-473b-a306-f5cf1c3ef093', // handoff_sms
  'a203126f-3187-4c91-96a4-c448f72cdfa6'  // update_crm_note
];

if (!VAPI_API_KEY) {
  console.error('❌ VAPI_API_KEY not found in environment');
  process.exit(1);
}

if (!WEBHOOK_SECRET) {
  console.error('❌ WEBHOOK_SHARED_SECRET not found in environment');
  process.exit(1);
}

async function fixAssistant() {
  console.log('🔄 Fixing Test 8 assistant configuration...');
  console.log('   Assistant ID:', ASSISTANT_ID);
  console.log('');

  // First, get current config
  console.log('📥 Fetching current configuration...');
  const getResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`
    }
  });

  if (!getResponse.ok) {
    const error = await getResponse.text();
    console.error('❌ Failed to fetch assistant:', error);
    process.exit(1);
  }

  const current = await getResponse.json();
  console.log('✅ Current config fetched');
  console.log('   Name:', current.name);
  console.log('   Has tools:', current.model?.toolIds?.length || 0, 'tools');
  console.log('   Server URL:', current.serverUrl || 'NOT SET');
  console.log('');

  // Update with tools and server authentication
  console.log('🔧 Updating assistant with:');
  console.log('   - 4 tools (create_booking, quote_estimate, handoff_sms, update_crm_note)');
  console.log('   - Server URL:', WEBHOOK_URL);
  console.log('   - Authentication: x-vapi-secret');
  console.log('');

  const updatePayload = {
    model: {
      ...current.model,
      toolIds: TOOL_IDS
    },
    serverUrl: WEBHOOK_URL,
    serverUrlSecret: WEBHOOK_SECRET
  };

  const updateResponse = await fetch(`https://api.vapi.ai/assistant/${ASSISTANT_ID}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${VAPI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(updatePayload)
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    console.error('❌ Failed to update assistant:', error);
    process.exit(1);
  }

  const result = await updateResponse.json();
  console.log('✅ Assistant updated successfully!');
  console.log('');
  console.log('📋 New Configuration:');
  console.log('   Name:', result.name);
  console.log('   Tools:', result.model?.toolIds?.length || 0);
  console.log('   Server URL:', result.serverUrl || 'NOT SET');
  console.log('   Secret configured:', !!WEBHOOK_SECRET);
  console.log('');
  console.log('🧪 Next steps:');
  console.log('   1. Make a test call to +17402403270');
  console.log('   2. Check Vercel logs for authenticated webhook events');
  console.log('   3. Verify booking gets created in database');
  console.log('');
  console.log('🎉 Test 8 assistant is now fully configured!');
}

fixAssistant().catch(console.error);
