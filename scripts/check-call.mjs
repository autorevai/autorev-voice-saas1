#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const VAPI_CALL_ID = '0199bd34-b71b-7449-9b9c-843976b620da';

async function checkCall() {
  // Get call data
  const { data: call } = await supabase
    .from('calls')
    .select('*')
    .eq('vapi_call_id', VAPI_CALL_ID)
    .single();

  console.log('📞 CALL DATA:');
  console.log({
    id: call.id,
    customer_name: call.customer_name,
    customer_phone: call.customer_phone,
    customer_address: call.customer_address,
    customer_city: call.customer_city,
    customer_state: call.customer_state,
    customer_zip: call.customer_zip,
    outcome: call.outcome
  });

  // Get linked booking
  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('call_id', call.id)
    .single();

  console.log('\n📅 BOOKING DATA:');
  console.log({
    id: booking?.id,
    name: booking?.name,
    phone: booking?.phone,
    address: booking?.address,
    city: booking?.city,
    state: booking?.state,
    zip: booking?.zip
  });

  // Get tool results
  const { data: toolResults } = await supabase
    .from('tool_results')
    .select('*')
    .eq('call_id', call.id);

  console.log('\n🔧 TOOL RESULTS:', toolResults?.length || 0);
  if (toolResults?.[0]) {
    console.log('Request data:', toolResults[0].request_json);
  }
}

checkCall().catch(console.error);
