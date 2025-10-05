import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function testPhoneCreation() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🧪 Testing Phone Number Creation with Region...')
    console.log('=' .repeat(50))
    
    // Use the assistant we created earlier
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    console.log('📞 Creating phone number with region parameter...')
    console.log(`   Assistant ID: ${assistantId}`)
    console.log('')
    
    const phone = await vapi.phoneNumbers.create({
      provider: 'vapi',
      assistantId: assistantId,
      name: 'test-phone-with-region',
      region: 'us-east-1',
      fallbackDestination: {
        type: 'number',
        number: '+17407393487'
      }
    });
    
    console.log('✅ Phone number created!')
    console.log('Full response:')
    console.log(JSON.stringify(phone, null, 2))
    console.log('')
    
    if (phone.number) {
      console.log('🎉 SUCCESS! Phone number assigned:')
      console.log(`   📞 Call: ${phone.number}`)
      console.log(`   🔗 Dashboard: https://dashboard.vapi.ai/phone-numbers/${phone.id}`)
      console.log('')
      console.log('🧪 Test Instructions:')
      console.log(`   1. Call: ${phone.number}`)
      console.log(`   2. Say: "I need HVAC service"`)
      console.log(`   3. Test booking: "I need an appointment"`)
      console.log(`   4. Test emergency: "My heat is broken"`)
      console.log(`   5. Should forward to: +17407393487`)
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

testPhoneCreation()
