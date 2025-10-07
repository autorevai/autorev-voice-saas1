#!/usr/bin/env node
// Fix historical calls for specific tenant

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51';

async function fixTenantCalls() {
  console.log('🔧 Fixing calls for tenant:', TENANT_ID, '\n');

  // 1. Link bookings to calls by time proximity
  const { data: unlinkedBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .is('call_id', null);

  console.log(`Found ${unlinkedBookings?.length || 0} unlinked bookings\n`);

  for (const booking of unlinkedBookings || []) {
    const bookingTime = new Date(booking.created_at);
    const start = new Date(bookingTime.getTime() - 10 * 60 * 1000).toISOString();
    const end = new Date(bookingTime.getTime() + 10 * 60 * 1000).toISOString();

    const { data: calls } = await supabase
      .from('calls')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .gte('started_at', start)
      .lte('started_at', end)
      .order('started_at', { ascending: false });

    if (calls?.[0]) {
      await supabase
        .from('bookings')
        .update({ call_id: calls[0].id })
        .eq('id', booking.id);

      // Update call with booking data
      await supabase
        .from('calls')
        .update({
          outcome: 'booked',
          customer_name: booking.name,
          customer_phone: booking.phone,
          customer_address: booking.address,
          customer_city: booking.city,
          customer_state: booking.state,
          customer_zip: booking.zip
        })
        .eq('id', calls[0].id);

      console.log(`✅ Linked: ${booking.name} → ${calls[0].vapi_call_id?.substring(0, 12)}`);
    }
  }

  // 2. Update from tool_results
  const { data: toolResults } = await supabase
    .from('tool_results')
    .select('call_id, request_json, response_json')
    .eq('tool_name', 'create_booking')
    .eq('success', true);

  for (const tool of toolResults || []) {
    const data = tool.request_json;
    if (data) {
      await supabase
        .from('calls')
        .update({
          customer_name: data.name,
          customer_phone: data.phone,
          customer_address: data.address,
          customer_city: data.city,
          customer_state: data.state,
          customer_zip: data.zip,
          outcome: 'booked'
        })
        .eq('id', tool.call_id);

      console.log(`✅ Updated from tool_results: ${tool.call_id?.substring(0, 12)}`);
    }
  }

  // 3. Update all calls with data from their linked bookings
  console.log('\n📋 Step 3: Syncing call data from bookings...\n');

  const { data: linkedBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .not('call_id', 'is', null);

  for (const booking of linkedBookings || []) {
    await supabase
      .from('calls')
      .update({
        customer_name: booking.name,
        customer_phone: booking.phone,
        customer_address: booking.address,
        customer_city: booking.city,
        customer_state: booking.state,
        customer_zip: booking.zip
      })
      .eq('id', booking.call_id);

    console.log(`✅ Synced: ${booking.name} (state: ${booking.state})`);
  }

  console.log('\n✅ Done!');
}

fixTenantCalls().catch(console.error);
