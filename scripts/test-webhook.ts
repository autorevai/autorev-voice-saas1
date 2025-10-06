#!/usr/bin/env tsx
// scripts/test-webhook.ts
// Test script for VAPI webhook endpoint

import { config } from 'dotenv';

config({ path: '.env.local' });

const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/vapi/webhook`
  : 'http://localhost:3000/api/vapi/webhook';

const WEBHOOK_SECRET = process.env.WEBHOOK_SHARED_SECRET || '';

interface TestCase {
  name: string;
  payload: any;
}

const testCases: TestCase[] = [
  {
    name: 'Assistant Request',
    payload: {
      message: {
        type: 'assistant-request',
        call: {
          id: `test_call_${Date.now()}`,
          startedAt: new Date().toISOString()
        }
      }
    }
  },
  {
    name: 'End of Call Report',
    payload: {
      message: {
        type: 'end-of-call-report',
        call: {
          id: `test_call_${Date.now()}`
        },
        startedAt: new Date(Date.now() - 120000).toISOString(),
        endedAt: new Date().toISOString(),
        durationSeconds: 120,
        transcript: 'Test call transcript',
        summary: 'Test call summary',
        endedReason: 'customer-ended-call'
      }
    }
  },
  {
    name: 'Status Update',
    payload: {
      message: {
        type: 'status-update',
        call: {
          id: `test_call_${Date.now()}`
        },
        status: 'in-progress'
      }
    }
  },
  {
    name: 'Tool Calls',
    payload: {
      message: {
        type: 'tool-calls',
        call: {
          id: `test_call_${Date.now()}`
        },
        toolCalls: [
          {
            function: {
              name: 'create_booking',
              arguments: {
                name: 'John Doe',
                phone: '555-1234',
                address: '123 Main St'
              }
            }
          }
        ]
      }
    }
  }
];

async function testWebhook(testCase: TestCase) {
  console.log(`\n🧪 Testing: ${testCase.name}`);
  console.log('─'.repeat(60));

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET
      },
      body: JSON.stringify(testCase.payload)
    });

    const data = await response.json();

    console.log(`Status: ${response.status} ${response.ok ? '✅' : '❌'}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (response.status === 200) {
      console.log('✅ Test passed');
    } else {
      console.log('❌ Test failed');
    }
  } catch (error: any) {
    console.log('❌ Test error:', error.message);
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Webhook Tests');
  console.log('═'.repeat(60));
  console.log(`Webhook URL: ${WEBHOOK_URL}`);
  console.log(`Auth: ${WEBHOOK_SECRET ? 'Enabled ✅' : 'Disabled ⚠️'}`);

  for (const testCase of testCases) {
    await testWebhook(testCase);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }

  console.log('\n✨ All tests complete\n');
}

runAllTests().catch(console.error);
