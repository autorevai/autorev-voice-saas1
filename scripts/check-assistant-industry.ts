// Check what industry the assistant was created with
// Run: npx tsx scripts/check-assistant-industry.ts

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

const TENANT_ID = 'ab5db152-b5a8-4100-9eaa-0df9f8551b20'

async function checkAssistant() {
  try {
    console.log('🔍 Checking assistants for tenant:', TENANT_ID)

    const { data: assistants, error } = await supabase
      .from('assistants')
      .select('id, name, vapi_assistant_id, industry, created_at')
      .eq('tenant_id', TENANT_ID)

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    if (!assistants || assistants.length === 0) {
      console.log('❌ No assistants found')
      return
    }

    console.log(`\n📱 Found ${assistants.length} assistant(s):\n`)

    assistants.forEach((assistant) => {
      console.log('---')
      console.log('Name:', assistant.name)
      console.log('VAPI ID:', assistant.vapi_assistant_id)
      console.log('Industry:', assistant.industry || '❌ NOT SET')
      console.log('Created:', new Date(assistant.created_at).toLocaleString())
    })

  } catch (error: any) {
    console.error('❌ Error:', error.message || error)
  }
}

checkAssistant()
