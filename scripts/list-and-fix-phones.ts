// List all VAPI phone numbers and fix the one missing serverUrl
// Run: npx tsx scripts/list-and-fix-phones.ts

import { VapiClient } from '@vapi-ai/server-sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const vapiKey = process.env.VAPI_API_KEY!
const vapi = new VapiClient({ token: vapiKey })
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL + '/api/vapi/webhook'
const TARGET_PHONE = '+17403008309'

async function fixPhones() {
  try {
    console.log('📞 Listing all phone numbers...\n')
    const phones = await vapi.phoneNumbers.list()

    for (const phone of phones) {
      console.log('---')
      console.log('📱 Number:', phone.number)
      console.log('🆔 ID:', phone.id)
      console.log('👤 Assistant:', phone.assistantId || 'NOT SET')
      console.log('🔗 Server URL:', phone.server?.url || '❌ NOT SET')

      // Fix the target phone
      if (phone.number === TARGET_PHONE && !phone.server?.url) {
        console.log('\n🔧 FIXING THIS PHONE...')
        await vapi.phoneNumbers.update(phone.id, {
          serverUrl: WEBHOOK_URL,
          serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'secret'
        } as any)
        console.log('✅ Fixed! Server URL:', WEBHOOK_URL)
      }
    }

    console.log('\n🎉 Done!')

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

fixPhones()
