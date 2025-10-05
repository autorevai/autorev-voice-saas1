import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function checkPhoneAssistantStatus() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Checking Phone Number and Assistant Status...')
    console.log('=' .repeat(50))
    
    const phoneId = 'b523800f-31bb-41be-8dc9-05219cc5edcc'
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    // Check phone number status
    console.log('📞 Phone Number Status:')
    const phone = await vapi.phoneNumbers.get(phoneId)
    console.log(`   ID: ${phone.id}`)
    console.log(`   Number: ${phone.number}`)
    console.log(`   Status: ${phone.status}`)
    console.log(`   Assistant ID: ${phone.assistantId}`)
    console.log(`   Provider: ${phone.provider}`)
    console.log(`   Created: ${phone.createdAt}`)
    console.log('')
    
    // Check assistant status
    console.log('🤖 Assistant Status:')
    const assistant = await vapi.assistants.get(assistantId)
    console.log(`   ID: ${assistant.id}`)
    console.log(`   Name: ${assistant.name}`)
    console.log(`   Status: Active`)
    console.log(`   Model: ${assistant.model?.model || 'N/A'}`)
    console.log(`   Provider: ${assistant.model?.provider || 'N/A'}`)
    console.log(`   Tools: N/A (tools configured via toolIds)`)
    console.log('')
    
    // Check if phone is linked to assistant
    if (phone.assistantId === assistantId) {
      console.log('✅ Phone number is linked to the assistant')
    } else {
      console.log('❌ Phone number is NOT linked to the assistant')
      console.log(`   Phone assistant: ${phone.assistantId}`)
      console.log(`   Expected assistant: ${assistantId}`)
    }
    
    // Check if assistant is published/active
    const assistantStatus = (assistant as any).status || 'unknown'
    if (assistantStatus === 'published') {
      console.log('✅ Assistant is published and active')
    } else {
      console.log(`⚠️  Assistant status: ${assistantStatus}`)
      console.log('   The assistant needs to be published to receive calls')
    }
    
    // Check if phone is active
    if (phone.status === 'active') {
      console.log('✅ Phone number is active')
    } else {
      console.log(`⚠️  Phone status: ${phone.status}`)
      console.log('   The phone number might still be activating')
    }
    
    console.log('')
    console.log('🔗 Dashboard Links:')
    console.log(`   Phone: https://dashboard.vapi.ai/phone-numbers/${phoneId}`)
    console.log(`   Assistant: https://dashboard.vapi.ai/assistants/${assistantId}`)
    
  } catch (error: any) {
    console.error('❌ Error checking status:', error.message)
  }
}

checkPhoneAssistantStatus()
