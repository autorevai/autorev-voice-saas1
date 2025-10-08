#!/usr/bin/env ts-node
// Apply call_count migration and test dual trial limits

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Applying call_count migration...\n')

  // Read migration file
  const migrationPath = path.resolve(__dirname, '../supabase/migrations/202510071920_add_call_count_tracking.sql')
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('📄 Migration SQL:')
  console.log(migrationSQL)
  console.log('')

  // Execute migration (Note: This requires direct database access)
  console.log('⚠️  To apply this migration, run:')
  console.log('   npx supabase db push\n')
  console.log('   OR execute the SQL directly in Supabase dashboard\n')

  return true
}

async function testTrialLimits() {
  console.log('🧪 Testing trial limits...\n')

  const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'

  // Get current usage
  const { data: usage, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('tenant_id', TENANT_ID)
    .single()

  if (error) {
    console.log('No existing usage found, which is expected for new trial')
    return
  }

  console.log('Current Usage:')
  console.log({
    minutesUsed: usage.minutes_used,
    callCount: usage.call_count || 0,
    overageMinutes: usage.overage_minutes,
  })

  console.log('\n📊 Trial Limits:')
  console.log('  Minutes: 25')
  console.log('  Calls: 10')
  console.log('  Whichever comes first!')

  const minutesRemaining = Math.max(0, 25 - usage.minutes_used)
  const callsRemaining = Math.max(0, 10 - (usage.call_count || 0))

  console.log('\n📈 Remaining:')
  console.log(`  Minutes: ${minutesRemaining}/25`)
  console.log(`  Calls: ${callsRemaining}/10`)

  const minutesPercent = (usage.minutes_used / 25) * 100
  const callsPercent = ((usage.call_count || 0) / 10) * 100

  console.log('\n📊 Usage:')
  console.log(`  Minutes: ${minutesPercent.toFixed(1)}%`)
  console.log(`  Calls: ${callsPercent.toFixed(1)}%`)

  if (minutesPercent >= 100 || callsPercent >= 100) {
    console.log('\n🚫 TRIAL LIMIT EXCEEDED!')
    console.log(`  Limiting factor: ${minutesPercent > callsPercent ? 'minutes' : 'calls'}`)
  } else if (minutesPercent >= 70 || callsPercent >= 70) {
    console.log('\n⚠️  WARNING: Approaching trial limit')
  } else {
    console.log('\n✅ Trial usage looks good')
  }
}

async function main() {
  try {
    await applyMigration()
    await testTrialLimits()

    console.log('\n✅ Done!')
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
