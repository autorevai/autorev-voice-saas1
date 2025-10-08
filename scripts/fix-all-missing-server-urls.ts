// Fix ALL phone numbers missing serverUrl
// Run: npx tsx scripts/fix-all-missing-server-urls.ts

import { VapiClient } from '@vapi-ai/server-sdk'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const vapiKey = process.env.VAPI_API_KEY!
const vapi = new VapiClient({ token: vapiKey })
const WEBHOOK_URL = process.env.NEXT_PUBLIC_APP_URL + '/api/vapi/webhook'

async function fixAll() {
  try {
    console.log('🔍 Finding all phones missing serverUrl...\n')
    const phones = await vapi.phoneNumbers.list()
    let fixed = 0

    for (const phone of phones) {
      if (!phone.server?.url) {
        console.log(`🔧 Fixing ${phone.number}...`)
        await vapi.phoneNumbers.update(phone.id, {
          serverUrl: WEBHOOK_URL,
          serverUrlSecret: process.env.VAPI_WEBHOOK_SECRET || 'secret'
        } as any)
        console.log(`✅ Fixed!`)
        fixed++
      }
    }

    console.log(`\n🎉 Fixed ${fixed} phone numbers!`)

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

fixAll()
