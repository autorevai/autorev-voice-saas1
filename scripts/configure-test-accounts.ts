// Configure test accounts:
// - test8: paid active account (demo)
// - test7: trial account (to test trial limits)

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function configureAccounts() {
  try {
    const TEST8_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC
    const TEST7_ID = '865f44b8-710a-4606-9ebd-742392ba0df6' // Test 7 HVAC

    console.log('🔍 Looking up test accounts...\n')

    const { data: tenants, error: tenantsError } = await supabase
      .from('tenants')
      .select('id, name, subscription_status, plan_tier')
      .in('id', [TEST7_ID, TEST8_ID])

    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError)
      return
    }

    if (!tenants || tenants.length === 0) {
      console.log('❌ No tenants found')
      return
    }

    console.log('Found tenants:', tenants.map(t => `${t.name} (${t.subscription_status})`).join(', '))

    const test7 = tenants.find(t => t.id === TEST7_ID)
    const test8 = tenants.find(t => t.id === TEST8_ID)

    // Configure test8 as paid
    if (test8) {
      console.log('\n📝 Configuring test8 as PAID account...')
      console.log(`   Current: ${test8.subscription_status}`)

      const now = new Date()
      const periodStart = now
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'active',
          plan_tier: 'starter',
          trial_ends_at: null,
          current_period_start: periodStart.toISOString(),
          current_period_end: periodEnd.toISOString()
        })
        .eq('id', test8.id)

      if (error) {
        console.error('   ❌ Error:', error.message)
      } else {
        console.log('   ✅ test8 → active (starter plan)')
      }
    }

    // Configure test7 as trial
    if (test7) {
      console.log('\n📝 Configuring test7 as TRIAL account...')
      console.log(`   Current: ${test7.subscription_status}`)

      const now = new Date()
      const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000) // 14 days from now

      const { error } = await supabase
        .from('tenants')
        .update({
          subscription_status: 'trialing',
          plan_tier: 'starter',
          trial_ends_at: trialEnd.toISOString(),
          current_period_start: now.toISOString(),
          current_period_end: trialEnd.toISOString(),
          stripe_subscription_id: null,
          stripe_customer_id: null
        })
        .eq('id', test7.id)

      if (error) {
        console.error('   ❌ Error:', error.message)
      } else {
        console.log('   ✅ test7 → trialing (14 days)')
      }
    }

    // Verify final state
    console.log('\n✅ Final configuration:')
    const { data: final } = await supabase
      .from('tenants')
      .select('name, subscription_status, plan_tier, trial_ends_at')
      .in('id', [TEST7_ID, TEST8_ID])

    final?.forEach(t => {
      console.log(`   ${t.name}: ${t.subscription_status} (${t.plan_tier})${t.trial_ends_at ? ` - ends ${new Date(t.trial_ends_at).toLocaleDateString()}` : ''}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

configureAccounts()
