#!/usr/bin/env tsx
// scripts/seed-test-data.ts
// Seed the database with test data for development

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const demoTenantId = process.env.DEMO_TENANT_ID!;

if (!supabaseUrl || !supabaseKey || !demoTenantId) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DEMO_TENANT_ID');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedCalls() {
  console.log('\n📞 Seeding test calls...');

  const calls = [
    {
      tenant_id: demoTenantId,
      vapi_call_id: `seed_call_${Date.now()}_1`,
      started_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      ended_at: new Date(Date.now() - 3000000).toISOString(), // 50 min ago
      duration_sec: 600, // 10 minutes
      outcome: 'booked',
      cost_cents: 150,
      raw_json: {
        customer_sentiment: 'positive',
        issue: 'AC not cooling properly'
      }
    },
    {
      tenant_id: demoTenantId,
      vapi_call_id: `seed_call_${Date.now()}_2`,
      started_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      ended_at: new Date(Date.now() - 6900000).toISOString(), // 1hr 55min ago
      duration_sec: 300, // 5 minutes
      outcome: 'handoff',
      cost_cents: 75,
      raw_json: {
        customer_sentiment: 'neutral',
        issue: 'Price quote request'
      }
    },
    {
      tenant_id: demoTenantId,
      vapi_call_id: `seed_call_${Date.now()}_3`,
      started_at: new Date(Date.now() - 900000).toISOString(), // 15 min ago
      ended_at: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      duration_sec: 300, // 5 minutes
      outcome: 'completed',
      cost_cents: 75,
      raw_json: {
        customer_sentiment: 'positive',
        issue: 'General inquiry'
      }
    }
  ];

  const { data, error } = await supabase.from('calls').insert(calls).select();

  if (error) {
    console.error('❌ Error seeding calls:', error.message);
    return null;
  }

  console.log(`✅ Seeded ${data.length} test calls`);
  return data;
}

async function seedBookings(callIds: string[]) {
  console.log('\n📅 Seeding test bookings...');

  const bookings = [
    {
      tenant_id: demoTenantId,
      call_id: callIds[0],
      confirmation: 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      window_text: 'Tomorrow 9-11 AM',
      start_ts: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
      duration_min: 120,
      name: 'Sarah Johnson',
      phone: '+14155551234',
      email: 'sarah.johnson@example.com',
      address: '123 Main Street',
      city: 'San Francisco',
      state: 'CA',
      zip: '94102',
      summary: 'HVAC Maintenance - AC not cooling properly',
      equipment: 'Carrier AC Unit, 5 years old',
      priority: 'urgent',
      source: 'voice_call'
    },
    {
      tenant_id: demoTenantId,
      confirmation: 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      window_text: 'Next Week Monday 2-4 PM',
      start_ts: new Date(Date.now() + 518400000).toISOString(), // 6 days from now
      duration_min: 90,
      name: 'Michael Chen',
      phone: '+14155555678',
      email: 'michael.chen@example.com',
      address: '456 Oak Avenue',
      city: 'Oakland',
      state: 'CA',
      zip: '94601',
      summary: 'Routine HVAC Inspection',
      equipment: 'Trane HVAC System, 3 years old',
      priority: 'standard',
      source: 'voice_call'
    },
    {
      tenant_id: demoTenantId,
      confirmation: 'BK' + Math.random().toString(36).substring(2, 8).toUpperCase(),
      window_text: 'Today 3-5 PM',
      start_ts: new Date(Date.now() + 10800000).toISOString(), // 3 hours from now
      duration_min: 120,
      name: 'Emily Rodriguez',
      phone: '+14155559012',
      address: '789 Pine Street',
      city: 'Berkeley',
      state: 'CA',
      zip: '94704',
      summary: 'Emergency - Furnace not working',
      equipment: 'Lennox Furnace, 8 years old',
      priority: 'urgent',
      source: 'voice_call'
    }
  ];

  const { data, error } = await supabase.from('bookings').insert(bookings).select();

  if (error) {
    console.error('❌ Error seeding bookings:', error.message);
    return null;
  }

  console.log(`✅ Seeded ${data.length} test bookings`);
  return data;
}

async function seedToolResults(callIds: string[]) {
  console.log('\n🔧 Seeding test tool results...');

  const toolResults = [
    {
      call_id: callIds[0],
      tool_name: 'create_booking',
      request_json: {
        name: 'Sarah Johnson',
        phone: '+14155551234',
        service_type: 'HVAC Maintenance'
      },
      response_json: {
        success: true,
        confirmation: 'BK123456'
      },
      success: true
    },
    {
      call_id: callIds[1],
      tool_name: 'quote_estimate',
      request_json: {
        service_type: 'HVAC Maintenance'
      },
      response_json: {
        price_range: '$89-$159'
      },
      success: true
    },
    {
      call_id: callIds[1],
      tool_name: 'handoff_sms',
      request_json: {
        phone: '+14155555678',
        reason: 'Customer wants detailed quote'
      },
      response_json: {
        sms_type: 'handoff_request'
      },
      success: true
    }
  ];

  const { data, error } = await supabase.from('tool_results').insert(toolResults).select();

  if (error) {
    console.error('❌ Error seeding tool results:', error.message);
    return null;
  }

  console.log(`✅ Seeded ${data.length} test tool results`);
  return data;
}

async function main() {
  console.log('\n🌱 Starting test data seeding');
  console.log('═'.repeat(60));
  console.log(`Supabase URL: ${supabaseUrl}`);
  console.log(`Demo Tenant ID: ${demoTenantId}`);

  // Seed calls first
  const calls = await seedCalls();
  if (!calls) {
    console.error('\n❌ Failed to seed calls. Aborting.');
    process.exit(1);
  }

  const callIds = calls.map(c => c.id);

  // Seed bookings
  await seedBookings(callIds);

  // Seed tool results
  await seedToolResults(callIds);

  console.log('\n✨ Test data seeding complete!\n');
  console.log('🎉 You can now view this data in your dashboard\n');
}

main().catch((error) => {
  console.error('\n❌ Seeding failed:', error.message);
  process.exit(1);
});
