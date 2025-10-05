import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function testVapiAuth() {
  console.log('🔑 Testing VAPI Authentication...')
  console.log('=' .repeat(50))
  
  const apiKey = process.env.VAPI_API_KEY
  const orgId = process.env.VAPI_ORG_ID
  
  console.log(`API Key: ${apiKey ? apiKey.substring(0, 10) + '...' : 'NOT SET'}`)
  console.log(`Org ID: ${orgId ? orgId.substring(0, 10) + '...' : 'NOT SET'}`)
  console.log('')
  
  if (!apiKey) {
    console.error('❌ VAPI_API_KEY not found in environment')
    return
  }
  
  try {
    const vapi = new VapiClient({ token: apiKey })
    
    console.log('🚀 Testing VAPI API connection...')
    
    // Try to list assistants (simple API call)
    const assistants = await vapi.assistants.list()
    
    console.log('✅ VAPI Authentication successful!')
    console.log(`   Found ${assistants.length} existing assistants`)
    
    if (assistants.length > 0) {
      console.log('   Recent assistants:')
      assistants.slice(0, 3).forEach((assistant, index) => {
        console.log(`   ${index + 1}. ${assistant.name} (${assistant.id})`)
      })
    }
    
  } catch (error: any) {
    console.error('❌ VAPI Authentication failed:')
    console.error(`   Status: ${error.statusCode}`)
    console.error(`   Message: ${error.message}`)
    console.error(`   Body:`, error.body)
    console.log('')
    console.log('💡 Troubleshooting:')
    console.log('   1. Check if VAPI_API_KEY is correct')
    console.log('   2. Verify the key has proper permissions')
    console.log('   3. Check if you need to use a different key format')
    console.log('   4. Visit: https://dashboard.vapi.ai/settings/api-keys')
  }
}

testVapiAuth()
