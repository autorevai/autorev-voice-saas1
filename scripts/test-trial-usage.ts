// Script to test trial usage limits for test8 tenant
// Adds sample calls to verify trial tracking (25 minutes OR 10 calls)

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function addTestCalls() {
  try {
    console.log('🔍 Looking up test8 tenant...')

    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, subscription_status, trial_ends_at')
      .ilike('name', '%test8%')
      .single()

    if (tenantError || !tenant) {
      console.error('❌ Failed to find test8 tenant:', tenantError)
      return
    }

    console.log('✅ Found tenant:', {
      id: tenant.id,
      name: tenant.name,
      status: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at
    })

    // Scenario 1: Add 5 calls with 3 minutes each (15 minutes total, 5 calls)
    console.log('\n📞 Scenario: Adding 5 calls with 3 minutes each')

    const testCalls = [
      { duration: 180, outcome: 'booked', customer: 'John Smith' },
      { duration: 150, outcome: 'unknown', customer: 'Jane Doe' },
      { duration: 200, outcome: 'booked', customer: 'Bob Johnson' },
      { duration: 170, outcome: 'handoff', customer: 'Alice Williams' },
      { duration: 190, outcome: 'booked', customer: 'Charlie Brown' }
    ]

    for (let i = 0; i < testCalls.length; i++) {
      const call = testCalls[i]
      console.log(`\n  Adding call ${i + 1}/${testCalls.length}: ${call.customer} - ${call.duration}s (${Math.ceil(call.duration / 60)}min)`)

      // Insert call - need vapi_call_id and started_at (required fields)
      const { data: insertedCall, error: callError} = await supabase
        .from('calls')
        .insert({
          tenant_id: tenant.id,
          vapi_call_id: `test_call_${Date.now()}_${i}`,
          started_at: new Date(Date.now() - (i * 3600000)).toISOString(),
          ended_at: new Date(Date.now() - (i * 3600000) + (call.duration * 1000)).toISOString(),
          duration_sec: call.duration,
          outcome: call.outcome,
          customer_name: call.customer,
          customer_phone: `+1555000${1000 + i}`,
          raw_json: {}
        })
        .select()
        .single()

      if (callError) {
        console.error(`  ❌ Error inserting call:`, callError)
        continue
      }

      console.log(`  ✅ Call added: ${insertedCall.id}`)
    }

    // Calculate final totals from calls table
    const { data: allCalls } = await supabase
      .from('calls')
      .select('duration_sec')
      .eq('tenant_id', tenant.id)

    const totalCalls = allCalls?.length || 0
    const totalSeconds = allCalls?.reduce((sum, c) => sum + (c.duration_sec || 0), 0) || 0
    const totalMinutes = Math.ceil(totalSeconds / 60)

    console.log('\n✅ Test complete! Final usage:')
    console.log(`   📞 Calls: ${totalCalls} / 10 (${((totalCalls) / 10 * 100).toFixed(0)}%)`)
    console.log(`   ⏱️  Minutes: ${totalMinutes} / 25 (${((totalMinutes) / 25 * 100).toFixed(0)}%)`)

    const callsRemaining = Math.max(0, 10 - totalCalls)
    const minutesRemaining = Math.max(0, 25 - totalMinutes)

    console.log(`\n   Remaining: ${callsRemaining} calls or ${minutesRemaining} minutes`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

addTestCalls()
