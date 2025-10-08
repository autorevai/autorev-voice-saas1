// Check tenant voice config and industry
// Run: npx tsx scripts/check-tenant-voice-config.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const TENANT_ID = 'ab5db152-b5a8-4100-9eaa-0df9f8551b20'

async function checkTenant() {
  try {
    console.log('🔍 Checking tenant:', TENANT_ID)

    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, industry, voice_config, voice_config_pending_changes, voice_config_published_at')
      .eq('id', TENANT_ID)
      .single()

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log('\n📊 Tenant Data:')
    console.log('  Name:', tenant.name)
    console.log('  Industry:', tenant.industry || '❌ NOT SET')
    console.log('  Voice Config:', tenant.voice_config ? 'EXISTS' : '❌ NOT SET')
    console.log('  Pending Changes:', tenant.voice_config_pending_changes)
    console.log('  Published At:', tenant.voice_config_published_at || 'Never')

    if (tenant.voice_config) {
      console.log('\n📝 Voice Config Details:')
      const config = tenant.voice_config as any
      console.log('  Voice:', config.voice?.name || 'Not set')
      console.log('  Style:', config.style?.tone || 'Not set')
      console.log('  Services:', config.services?.length || 0)
      console.log('  Key Info:', config.keyInfo?.length || 0)

      if (config.services?.length > 0) {
        console.log('\n🛠️  Services:')
        config.services.forEach((s: any) => {
          console.log(`    - ${s.name} (${s.priceRange || 'no price'})`)
        })
      }

      if (config.keyInfo?.length > 0) {
        console.log('\n📌 Key Info:')
        config.keyInfo.forEach((k: string) => {
          console.log(`    - ${k}`)
        })
      }
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

checkTenant()
