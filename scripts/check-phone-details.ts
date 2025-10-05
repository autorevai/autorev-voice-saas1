import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function checkPhoneDetails() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Checking phone number details...')
    console.log('=' .repeat(50))
    
    // Check our test phone specifically
    const phoneId = 'a8e3f6c5-be9c-4ba6-a9d1-84da079ae605'
    
    console.log('📞 Checking our test phone number...')
    const phone = await vapi.phoneNumbers.get(phoneId)
    
    console.log('Full phone object:')
    console.log(JSON.stringify(phone, null, 2))
    console.log('')
    
    // Also check the working phone number
    const workingPhoneId = '90633b6c-0c0b-4330-873c-be0af2bcbd22'
    console.log('📞 Checking working phone number...')
    const workingPhone = await vapi.phoneNumbers.get(workingPhoneId)
    
    console.log('Working phone object:')
    console.log(JSON.stringify(workingPhone, null, 2))
    
  } catch (error: any) {
    console.error('❌ Error checking phone details:', error.message)
  }
}

checkPhoneDetails()
