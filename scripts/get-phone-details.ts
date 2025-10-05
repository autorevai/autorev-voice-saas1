import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function getPhoneDetails() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Getting phone number details...')
    
    // Get the phone number we just created
    const phoneId = 'a8e3f6c5-be9c-4ba6-a9d1-84da079ae605'
    const phone = await vapi.phoneNumbers.get(phoneId)
    
    console.log('📞 Phone Number Details:')
    console.log(`   ID: ${phone.id}`)
    console.log(`   Number: ${phone.number}`)
    console.log(`   Name: ${phone.name}`)
    console.log(`   Status: ${phone.status}`)
    console.log(`   Assistant: ${phone.assistantId}`)
    console.log(`   Provider: ${phone.provider}`)
    console.log(`   Fallback: ${JSON.stringify(phone.fallbackDestination)}`)
    console.log('')
    
    if (phone.number) {
      console.log('🎯 Test Instructions:')
      console.log(`   1. Call: ${phone.number}`)
      console.log(`   2. Test booking: "I need HVAC service"`)
      console.log(`   3. Test emergency: "My heat is broken"`)
      console.log(`   4. Should forward to: +17407393487`)
      console.log('')
      
      console.log('🔗 Dashboard Links:')
      console.log(`   Assistant: https://dashboard.vapi.ai/assistants/${phone.assistantId}`)
      console.log(`   Phone: https://dashboard.vapi.ai/phone-numbers/${phone.id}`)
    } else {
      console.log('⚠️  Phone number field is undefined - this might be a VAPI API issue')
    }
    
  } catch (error: any) {
    console.error('❌ Error getting phone details:', error.message)
  }
}

getPhoneDetails()
