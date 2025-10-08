// Check when test8 calls were made to set appropriate billing period

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

async function checkCallDates() {
  try {
    const TEST8_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51'

    console.log('📊 Analyzing test8 call dates...\n')

    // Get first and last call
    const { data: calls } = await supabase
      .from('calls')
      .select('started_at, duration_sec')
      .eq('tenant_id', TEST8_ID)
      .order('started_at', { ascending: true })

    if (!calls || calls.length === 0) {
      console.log('❌ No calls found for test8')
      return
    }

    const firstCall = new Date(calls[0].started_at)
    const lastCall = new Date(calls[calls.length - 1].started_at)

    console.log(`Total calls: ${calls.length}`)
    console.log(`First call: ${firstCall.toLocaleString()}`)
    console.log(`Last call: ${lastCall.toLocaleString()}`)

    // Calculate total usage
    const totalSeconds = calls.reduce((sum, c) => sum + (c.duration_sec || 0), 0)
    const totalMinutes = Math.ceil(totalSeconds / 60)

    console.log(`\nTotal usage: ${totalMinutes} minutes from ${calls.length} calls`)

    // Suggest period
    const periodStart = new Date(firstCall)
    periodStart.setHours(0, 0, 0, 0)

    const periodEnd = new Date(lastCall)
    periodEnd.setDate(periodEnd.getDate() + 7) // 7 days after last call
    periodEnd.setHours(23, 59, 59, 999)

    console.log(`\n💡 Suggested period:`)
    console.log(`   Start: ${periodStart.toISOString()} (${periodStart.toLocaleDateString()})`)
    console.log(`   End: ${periodEnd.toISOString()} (${periodEnd.toLocaleDateString()})`)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkCallDates()
