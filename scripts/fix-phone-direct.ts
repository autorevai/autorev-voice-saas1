// Fix phone serverUrl using VAPI assistant ID
// Run: npx tsx scripts/fix-phone-direct.ts

import { VapiClient } from '@vapi-ai/server-sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const vapiKey = process.env.VAPI_API_KEY!
const vapi = new VapiClient({ token: vapiKey })

const VAPI_ASSISTANT_ID = '71934c7e-c2ed-4390-b6a1-2fd248d443b6'
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL + '/api/vapi/webhook'

async function fixPhone() {
  try {
    console.log('🔍 Getting assistant from VAPI...')
    const assistant = await vapi.assistants.get(VAPI_ASSISTANT_ID)

    console.log('✅ Found assistant:', assistant.name)
    console.log('📱 Phone Number ID:', assistant.phoneNumberId || 'NOT SET')

    if (!assistant.phoneNumberId) {
      console.error('❌ No phone number linked to assistant')
      return
    }

    // Get phone details
    console.log('\n📞 Getting phone details...')
    const phone = await vapi.phoneNumbers.get(assistant.phoneNumberId)
    console.log('  Number:', phone.number)
    console.log('  Current Server URL:', phone.server?.url || '❌ NOT SET')

    if (phone.server?.url) {
      console.log('✅ Server URL already set!')
      return
    }

    // Fix it
    console.log('\n🔧 Updating phone with webhook URL:', WEBHOOK_URL)
    await vapi.phoneNumbers.update(assistant.phoneNumberId, {
      serverUrl: WEBHOOK_URL,
      serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'secret'
    } as any)

    console.log('✅ Phone updated successfully!')
    console.log('\n🎉 Check VAPI dashboard - server URL should now be set!')

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

fixPhone()
