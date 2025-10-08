#!/usr/bin/env ts-node
// Convert test8 tenant to trial status to test dual limits

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'

async function convertToTrial() {
  console.log('🔄 Converting test8 tenant to trial status...\n')

  // 1. Update tenant to trial status
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      subscription_status: 'trialing',
      plan_tier: 'starter',
      current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days from now
    })
    .eq('id', TENANT_ID)

  if (tenantError) {
    console.error('❌ Failed to update tenant:', tenantError)
    return
  }

  console.log('✅ Tenant updated to trial status')

  // 2. Reset or create usage_tracking with 0 usage
  const { data: existingUsage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .single()

  if (existingUsage) {
    // Reset existing usage
    await supabase
      .from('usage_tracking')
      .update({
        minutes_used: 0,
        call_count: 0,
        overage_minutes: 0,
        overage_amount_cents: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('id', existingUsage.id)

    console.log('✅ Usage tracking reset to 0')
  } else {
    // Create new usage tracking
    await supabase
      .from('usage_tracking')
      .insert({
        tenant_id: TENANT_ID,
        minutes_used: 0,
        call_count: 0,
        overage_minutes: 0,
        overage_amount_cents: 0,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      })

    console.log('✅ Usage tracking created')
  }

  // 3. Show current status
  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('id', TENANT_ID)
    .single()

  const { data: usage } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .single()

  console.log('\n📊 Current Status:')
  console.log('Tenant:', {
    subscription_status: tenant?.subscription_status,
    plan_tier: tenant?.plan_tier,
    current_period_end: tenant?.current_period_end
  })
  console.log('Usage:', {
    minutes_used: usage?.minutes_used,
    call_count: usage?.call_count,
    period_end: usage?.period_end
  })

  console.log('\n✅ Test8 is now on trial!')
  console.log('📞 Make test calls to see dual limits in action')
  console.log('   - Will block after 10 calls OR 25 minutes')
}

convertToTrial().catch(console.error)
