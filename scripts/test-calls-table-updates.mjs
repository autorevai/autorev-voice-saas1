#!/usr/bin/env node

/**
 * Test script to verify calls table updates via API calls
 * This simulates what happens when VAPI sends webhooks
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';
config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://autorev-voice-saas1.vercel.app';
const WEBHOOK_SECRET = process.env.WEBHOOK_SHARED_SECRET;

async function testWebhookUpdates() {
  console.log('🧪 Testing Calls Table Updates via API...\n');

  // Test 1: Simulate assistant-request webhook
  console.log('1️⃣ Testing assistant-request webhook...');
  const assistantRequestPayload = {
    message: {
      type: 'assistant-request',
      call: {
        id: `test-call-${Date.now()}`,
        assistantId: '9d1b9795-6a7b-49e7-8c68-ce45895338c3', // Your existing assistant ID
        startedAt: new Date().toISOString(),
        phoneNumber: {
          number: '+17407393487'
        },
        customer: {
          number: '+17407393487',
          name: 'Test Customer'
        }
      }
    }
  };

  try {
    const response1 = await fetch(`${BASE_URL}/api/vapi/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(assistantRequestPayload)
    });

    const result1 = await response1.json();
    console.log('✅ Assistant request result:', result1);
  } catch (error) {
    console.error('❌ Assistant request failed:', error.message);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Simulate conversation-update with customer data
  console.log('\n2️⃣ Testing conversation-update webhook...');
  const conversationPayload = {
    message: {
      type: 'conversation-update',
      call: {
        id: `test-call-${Date.now()}`,
        assistantId: '9d1b9795-6a7b-49e7-8c68-ce45895338c3'
      },
      transcript: "Hi, my name is Sarah Johnson. I live at 123 Main Street in Columbus, Ohio. My zip code is 43068. You can call me at 740-739-3487."
    }
  };

  try {
    const response2 = await fetch(`${BASE_URL}/api/vapi/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(conversationPayload)
    });

    const result2 = await response2.json();
    console.log('✅ Conversation update result:', result2);
  } catch (error) {
    console.error('❌ Conversation update failed:', error.message);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Simulate tool-calls webhook (create_booking)
  console.log('\n3️⃣ Testing tool-calls webhook...');
  const toolCallsPayload = {
    message: {
      type: 'tool-calls',
      call: {
        id: `test-call-${Date.now()}`,
        assistantId: '9d1b9795-6a7b-49e7-8c68-ce45895338c3'
      },
      toolCalls: [{
        function: {
          name: 'create_booking',
          arguments: JSON.stringify({
            name: 'Sarah Johnson',
            phone: '740-739-3487',
            address: '123 Main Street',
            city: 'Columbus',
            state: 'Ohio',
            zip: '43068',
            service_type: 'AC Repair',
            preferred_time: 'tomorrow 2pm'
          })
        }
      }]
    }
  };

  try {
    const response3 = await fetch(`${BASE_URL}/api/vapi/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(toolCallsPayload)
    });

    const result3 = await response3.json();
    console.log('✅ Tool calls result:', result3);
  } catch (error) {
    console.error('❌ Tool calls failed:', error.message);
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Simulate end-of-call-report
  console.log('\n4️⃣ Testing end-of-call-report webhook...');
  const endCallPayload = {
    message: {
      type: 'end-of-call-report',
      call: {
        id: `test-call-${Date.now()}`,
        assistantId: '9d1b9795-6a7b-49e7-8c68-ce45895338c3'
      },
      startedAt: new Date(Date.now() - 120000).toISOString(), // 2 minutes ago
      endedAt: new Date().toISOString(),
      durationSeconds: 120,
      transcript: "Full conversation transcript here...",
      summary: "Customer called about AC repair, booked appointment for tomorrow 2pm",
      endedReason: 'call-disconnected',
      cost: 0.25
    }
  };

  try {
    const response4 = await fetch(`${BASE_URL}/api/vapi/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(endCallPayload)
    });

    const result4 = await response4.json();
    console.log('✅ End of call result:', result4);
  } catch (error) {
    console.error('❌ End of call failed:', error.message);
  }

  console.log('\n🎯 Test completed! Check your dashboard to see if new calls appear.');
  console.log('📊 The calls should show up in:');
  console.log('   - Recent Calls table');
  console.log('   - Call Activity chart');
  console.log('   - Conversion Funnel chart');
  console.log('   - Peak Hours chart');
}

// Run the test
testWebhookUpdates().catch(console.error);
