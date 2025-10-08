// scripts/setup-test8-billing.ts
// Set up Test 8 tenant for billing testing

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC

async function setupTest8Billing() {
  console.log('🧪 Setting up Test 8 tenant for billing testing...')
  
  // 1. Set up subscription for Test 8
  console.log('📋 Setting up subscription...')
  const { error: subError } = await supabase
    .from('tenants')
    .update({
      plan_tier: 'starter',
      subscription_status: 'trialing',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', TENANT_ID)

  if (subError) {
    console.error('❌ Failed to update tenant subscription:', subError)
    return
  }

  // 2. Create a subscription record
  console.log('📝 Creating subscription record...')
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .insert({
      tenant_id: TENANT_ID,
      stripe_subscription_id: 'sub_test_' + Date.now(),
      stripe_customer_id: 'cus_test_' + Date.now(),
      status: 'trialing',
      plan_tier: 'starter',
      price_id: 'price_test_starter',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancel_at_period_end: false,
    })

  if (subscriptionError) {
    console.error('❌ Failed to create subscription:', subscriptionError)
    return
  }

  // 3. Create initial usage tracking record
  console.log('📊 Creating usage tracking record...')
  const { error: usageError } = await supabase
    .from('usage_tracking')
    .insert({
      tenant_id: TENANT_ID,
      period_start: new Date().toISOString(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      minutes_included: 500, // Starter plan
      minutes_used: 0,
      overage_minutes: 0,
      overage_amount_cents: 0,
      synced_to_stripe: false,
    })

  if (usageError) {
    console.error('❌ Failed to create usage tracking:', usageError)
    return
  }

  console.log('✅ Test 8 billing setup complete!')
  console.log('')
  console.log('🧪 Testing Instructions:')
  console.log('1. Visit: http://localhost:3003/dashboard')
  console.log('2. You should see the Trial Banner')
  console.log('3. You should see the Usage Dashboard')
  console.log('4. Make a test call to +17402403270')
  console.log('5. Check usage updates in real-time')
  console.log('')
  console.log('📊 To test overage:')
  console.log('1. Update usage_tracking table:')
  console.log('   UPDATE usage_tracking SET minutes_used = 600 WHERE tenant_id = \'' + TENANT_ID + '\';')
  console.log('2. Refresh dashboard to see overage alerts')
}

setupTest8Billing().catch(console.error)
