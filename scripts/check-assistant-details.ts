import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function checkAssistantDetails() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Checking Assistant Details...')
    console.log('=' .repeat(50))
    
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    const assistant = await vapi.assistants.get(assistantId)
    
    console.log('Full assistant object:')
    console.log(JSON.stringify(assistant, null, 2))
    
  } catch (error: any) {
    console.error('❌ Error getting assistant:', error.message)
  }
}

checkAssistantDetails()
