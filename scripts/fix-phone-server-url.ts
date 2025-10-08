// Fix phone numbers missing serverUrl
// Run: npx tsx scripts/fix-phone-server-url.ts <assistant_id>

import { VapiClient } from '@vapi-ai/server-sdk'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const vapiKey = process.env.VAPI_API_KEY!

if (!supabaseUrl || !supabaseKey || !vapiKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)
const vapi = new VapiClient({ token: vapiKey })

async function fixPhoneServerUrl(assistantId: string) {
  try {
    console.log('🔍 Looking up assistant:', assistantId)

    // Get assistant from database
    const { data: assistant, error } = await supabase
      .from('assistants')
      .select('*, tenants(*)')
      .eq('id', assistantId)
      .single()

    if (error || !assistant) {
      console.error('❌ Assistant not found:', error)
      return
    }

    console.log('✅ Found assistant:', assistant.name)
    console.log('📱 Phone:', assistant.phone_number)
    console.log('🔗 Webhook URL:', assistant.webhook_url)

    if (!assistant.vapi_phone_id) {
      console.error('❌ No VAPI phone ID found')
      return
    }

    // Get current phone config
    const phone = await vapi.phoneNumbers.get(assistant.vapi_phone_id)
    console.log('\n📞 Current phone config:')
    console.log('  Server URL:', phone.server?.url || 'NOT SET')

    if (phone.server?.url) {
      console.log('✅ Server URL already set, no fix needed')
      return
    }

    // Update phone with server URL
    console.log('\n🔧 Updating phone number with webhook URL...')
    await vapi.phoneNumbers.update(assistant.vapi_phone_id, {
      serverUrl: assistant.webhook_url,
      serverUrlSecret: assistant.webhook_secret
    } as any)

    console.log('✅ Phone number updated successfully!')
    console.log('  Server URL:', assistant.webhook_url)

  } catch (error) {
    console.error('❌ Error:', error)
  }
}

const assistantId = process.argv[2]

if (!assistantId) {
  console.error('Usage: npx tsx scripts/fix-phone-server-url.ts <assistant_id>')
  console.error('Example: npx tsx scripts/fix-phone-server-url.ts 71934c7e-c2ed-4390-b6a1-2fd248d443b6')
  process.exit(1)
}

fixPhoneServerUrl(assistantId)
