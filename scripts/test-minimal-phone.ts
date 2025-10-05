import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function testMinimalPhone() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🧪 Testing Minimal Phone Number Creation...')
    console.log('=' .repeat(50))
    
    // Use the assistant we created earlier
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    console.log('📞 Creating phone number with minimal parameters...')
    console.log(`   Assistant ID: ${assistantId}`)
    console.log('')
    
    // Try with just the required parameters
    const phone = await vapi.phoneNumbers.create({
      provider: 'vapi',
      assistantId: assistantId
    });
    
    console.log('✅ Phone number created!')
    console.log('Full response:')
    console.log(JSON.stringify(phone, null, 2))
    console.log('')
    
    if (phone.number) {
      console.log('🎉 SUCCESS! Phone number assigned:')
      console.log(`   📞 Call: ${phone.number}`)
      console.log(`   🔗 Dashboard: https://dashboard.vapi.ai/phone-numbers/${phone.id}`)
    } else {
      console.log('⚠️  Phone number field is still undefined')
      console.log('   This might be a VAPI free number provisioning issue')
      console.log('   Check the dashboard manually for the actual number')
    }
    
  } catch (error: any) {
    console.error('❌ Error creating phone number:', error.message)
    console.error('Status:', error.statusCode)
    console.error('Body:', error.body)
  }
}

testMinimalPhone()
