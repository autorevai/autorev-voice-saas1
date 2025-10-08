// Fix tenant industry and populate voice config
// Run: npx tsx scripts/fix-tenant-industry.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const TENANT_ID = 'ab5db152-b5a8-4100-9eaa-0df9f8551b20'
const INDUSTRY = 'hvac'

// Import defaults
const INDUSTRY_SERVICE_DEFAULTS: Record<string, any[]> = {
  hvac: [
    { name: 'AC Repair', priceRange: '$150-$500', description: 'Air conditioning repair and diagnostics' },
    { name: 'Heating Repair', priceRange: '$150-$500', description: 'Furnace and heating system repair' },
    { name: 'Maintenance Tune-up', priceRange: '$99-$200', description: 'Seasonal maintenance and inspection' },
    { name: 'System Installation', priceRange: '$3,000-$10,000', description: 'New HVAC system installation' },
    { name: 'Emergency Service', priceRange: '$200-$750', description: '24/7 emergency HVAC service' }
  ]
}

const INDUSTRY_KEY_INFO: Record<string, string[]> = {
  hvac: [
    'Licensed & Insured',
    '24/7 Emergency Service',
    'Same-Day Service Available',
    'Free Estimates on Installations'
  ]
}

const DEFAULT_VOICE_CONFIG = {
  voice: {
    provider: 'elevenlabs',
    voiceId: 'rachel',
    name: 'Rachel - Professional & Warm'
  },
  style: {
    tone: 'professional',
    pace: 'moderate',
    formality: 'balanced'
  },
  greeting: {
    standard: '',
    afterHours: '',
    emergency: ''
  },
  transferRules: {
    frustrated: true,
    technical: true,
    explicit: true
  },
  keyInfo: [] as string[],
  services: [] as any[]
}

async function fixTenant() {
  try {
    console.log('🔍 Fixing tenant:', TENANT_ID)

    // 1. Set industry on tenant
    console.log('\n📝 Setting industry to:', INDUSTRY)

    const { error: industryError } = await supabase
      .from('tenants')
      .update({ industry: INDUSTRY })
      .eq('id', TENANT_ID)

    if (industryError) {
      console.error('❌ Error setting industry:', industryError)
      return
    }

    console.log('✅ Industry set to:', INDUSTRY)

    // 2. Populate voice config with defaults
    const defaultServices = INDUSTRY_SERVICE_DEFAULTS[INDUSTRY] || []
    const defaultKeyInfo = INDUSTRY_KEY_INFO[INDUSTRY] || []

    const voiceConfig = {
      ...DEFAULT_VOICE_CONFIG,
      services: defaultServices,
      keyInfo: defaultKeyInfo
    }

    console.log('\n📝 Populating voice config with:')
    console.log('  Services:', defaultServices.length)
    console.log('  Key Info:', defaultKeyInfo.length)

    const { error: configError } = await supabase
      .from('tenants')
      .update({
        voice_config: voiceConfig,
        voice_config_pending_changes: true
      })
      .eq('id', TENANT_ID)

    if (configError) {
      console.error('❌ Error setting voice config:', configError)
      return
    }

    console.log('✅ Voice config populated!')

    // 3. Verify
    const { data: tenant } = await supabase
      .from('tenants')
      .select('industry, voice_config')
      .eq('id', TENANT_ID)
      .single()

    console.log('\n✅ Updated Tenant:')
    console.log('  Industry:', tenant?.industry)
    console.log('  Services:', (tenant?.voice_config as any)?.services?.length || 0)
    console.log('  Key Info:', (tenant?.voice_config as any)?.keyInfo?.length || 0)

    console.log('\n🎉 Done! Refresh the settings page to see the changes.')

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

fixTenant()
