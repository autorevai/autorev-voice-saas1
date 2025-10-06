#!/usr/bin/env tsx
// scripts/test-tools-api.ts
// Test script for VAPI tools API endpoint

import { config } from 'dotenv';

config({ path: '.env.local' });

const TOOLS_URL = process.env.NEXT_PUBLIC_APP_URL
  ? `${process.env.NEXT_PUBLIC_APP_URL}/api/tools`
  : 'http://localhost:3000/api/tools';

const WEBHOOK_SECRET = process.env.WEBHOOK_SHARED_SECRET || '';

interface ToolTest {
  name: string;
  tool: string;
  payload: any;
}

const toolTests: ToolTest[] = [
  {
    name: 'Create Booking - Valid Data',
    tool: 'create_booking',
    payload: {
      message: {
        call: {
          id: `test_call_${Date.now()}`
        }
      },
      name: 'John Smith',
      phone: '+14155551234',
      email: 'john@example.com',
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      service_type: 'HVAC Maintenance',
      preferred_time: 'Tomorrow at 2 PM',
      equipment_info: 'Carrier AC unit, 5 years old'
    }
  },
  {
    name: 'Create Booking - Invalid Phone',
    tool: 'create_booking',
    payload: {
      name: 'Jane Doe',
      phone: 'invalid-phone',
      address: '456 Oak Ave',
      service_type: 'Emergency Repair'
    }
  },
  {
    name: 'Quote Estimate - HVAC',
    tool: 'quote_estimate',
    payload: {
      service_type: 'HVAC Maintenance',
      equipment_info: 'Central AC unit'
    }
  },
  {
    name: 'Quote Estimate - Emergency',
    tool: 'quote_estimate',
    payload: {
      service_type: 'Emergency AC Repair',
      equipment_info: 'AC not working'
    }
  },
  {
    name: 'Handoff SMS',
    tool: 'handoff_sms',
    payload: {
      phone: '+14155551234',
      reason: 'Customer wants to speak to a technician'
    }
  },
  {
    name: 'Update CRM Note',
    tool: 'update_crm_note',
    payload: {
      note: 'Customer mentioned previous service was excellent',
      category: 'customer_feedback'
    }
  }
];

async function testTool(test: ToolTest) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log('─'.repeat(60));

  try {
    const response = await fetch(TOOLS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-shared-secret': WEBHOOK_SECRET,
        'x-tool-name': test.tool,
        'x-vapi-call-id': `test_call_${Date.now()}`,
        'x-tenant-id': process.env.DEMO_TENANT_ID || ''
      },
      body: JSON.stringify(test.payload)
    });

    const data = await response.json();

    console.log(`Status: ${response.status} ${response.status === 200 || response.status === 400 ? '✅' : '❌'}`);
    console.log(`Response:`, JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('✅ Tool executed successfully');
    } else if (test.name.includes('Invalid')) {
      console.log('✅ Validation working correctly');
    } else {
      console.log('❌ Tool execution failed');
    }
  } catch (error: any) {
    console.log('❌ Test error:', error.message);
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting Tools API Tests');
  console.log('═'.repeat(60));
  console.log(`Tools URL: ${TOOLS_URL}`);
  console.log(`Auth: ${WEBHOOK_SECRET ? 'Enabled ✅' : 'Disabled ⚠️'}`);
  console.log(`Demo Tenant ID: ${process.env.DEMO_TENANT_ID || 'Not set'}`);

  for (const test of toolTests) {
    await testTool(test);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between tests
  }

  console.log('\n✨ All tests complete\n');
}

runAllTests().catch(console.error);
