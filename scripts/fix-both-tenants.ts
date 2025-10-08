// Fix both test tenants with correct voice config structure
// Run: npx tsx scripts/fix-both-tenants.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Tenants to fix
const TENANTS = [
  { id: 'ab5db152-b5a8-4100-9eaa-0df9f8551b20', name: 'Test 9 (Bob\'s Heating & Cooling)' },
  { id: 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51', name: 'Test 8' }
]

const INDUSTRY = 'hvac'

// HVAC service defaults
const HVAC_SERVICES = [
  { name: 'AC Repair', priceRange: '$150-$500', description: 'Air conditioning repair and diagnostics' },
  { name: 'Heating Repair', priceRange: '$150-$500', description: 'Furnace and heating system repair' },
  { name: 'Maintenance Tune-up', priceRange: '$99-$200', description: 'Seasonal maintenance and inspection' },
  { name: 'System Installation', priceRange: '$3,000-$10,000', description: 'New HVAC system installation' },
  { name: 'Emergency Service', priceRange: '$200-$750', description: '24/7 emergency HVAC service' }
]

const HVAC_KEY_INFO = [
  'Licensed & Insured',
  '24/7 Emergency Service',
  'Same-Day Service Available',
  'Free Estimates on Installations'
]

// CORRECT voice config structure matching types.ts
const DEFAULT_VOICE_CONFIG = {
  voice: 'rachel' as const,
  style: 'friendly' as const,
  allowInterruptions: true,
  greetingType: 'default' as const,
  customGreeting: undefined,
  transferTriggers: {
    onAngry: true,
    onComplex: true,
    onRequest: true
  },
  keyInfo: HVAC_KEY_INFO,
  services: HVAC_SERVICES
}

async function fixTenant(tenantId: string, tenantName: string) {
  console.log(`\n🔧 Fixing ${tenantName} (${tenantId})...`)

  // 1. Set industry
  const { error: industryError } = await supabase
    .from('tenants')
    .update({ industry: INDUSTRY })
    .eq('id', tenantId)

  if (industryError) {
    console.error('  ❌ Error setting industry:', industryError.message)
    return false
  }

  console.log('  ✅ Industry set to: hvac')

  // 2. Set voice config with correct structure
  const { error: configError } = await supabase
    .from('tenants')
    .update({
      voice_config: DEFAULT_VOICE_CONFIG,
      voice_config_pending_changes: true
    })
    .eq('id', tenantId)

  if (configError) {
    console.error('  ❌ Error setting voice config:', configError.message)
    return false
  }

  console.log('  ✅ Voice config populated!')
  console.log('    - Services:', HVAC_SERVICES.length)
  console.log('    - Key Info:', HVAC_KEY_INFO.length)
  console.log('    - Voice:', DEFAULT_VOICE_CONFIG.voice)
  console.log('    - Style:', DEFAULT_VOICE_CONFIG.style)

  return true
}

async function main() {
  console.log('🚀 Fixing both test tenants with correct voice config structure\n')

  let successCount = 0

  for (const tenant of TENANTS) {
    const success = await fixTenant(tenant.id, tenant.name)
    if (success) successCount++
  }

  console.log(`\n🎉 Done! Fixed ${successCount}/${TENANTS.length} tenants`)
  console.log('\n📝 Next steps:')
  console.log('  1. Refresh the settings page')
  console.log('  2. Services and Key Info should now be populated')
  console.log('  3. Click "Publish Changes" to push to VAPI')
}

main()
