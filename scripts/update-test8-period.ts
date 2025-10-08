// Update test8 billing period to end Oct 15, 2025
// This makes it easier to see usage populate with real data

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

async function updatePeriod() {
  try {
    const TEST8_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'

    console.log('🔍 Updating test8 billing period...\n')

    // Set period: 30-day plan ending Oct 15, 2025
    const periodEnd = new Date('2025-10-15T23:59:59Z')
    const periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() - 30) // 30 days before end
    periodStart.setHours(0, 0, 0, 0)

    const { error } = await supabase
      .from('tenants')
      .update({
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString()
      })
      .eq('id', TEST8_ID)

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log('✅ Updated billing period:')
    console.log(`   Start: ${periodStart.toLocaleDateString()}`)
    console.log(`   End: ${periodEnd.toLocaleDateString()}`)

    // Count calls in this period
    const { data: calls } = await supabase
      .from('calls')
      .select('duration_sec, started_at')
      .eq('tenant_id', TEST8_ID)
      .gte('started_at', periodStart.toISOString())
      .lte('started_at', periodEnd.toISOString())

    const callCount = calls?.length || 0
    const totalSeconds = calls?.reduce((sum, c) => sum + (c.duration_sec || 0), 0) || 0
    const totalMinutes = Math.ceil(totalSeconds / 60)

    console.log(`\n📊 Usage in this period:`)
    console.log(`   Calls: ${callCount}`)
    console.log(`   Minutes: ${totalMinutes}`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

updatePeriod()
