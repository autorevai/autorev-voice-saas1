import { config } from 'dotenv'
import { provisionVapiAssistant } from '../services/vapi-provisioner'

// Load environment variables
config({ path: '.env.local' })

async function testNewVoiceSettings() {
  try {
    console.log('🧪 Testing New Voice Settings...')
    console.log('=' .repeat(50))
    
    const testConfig = {
      tenantId: process.env.DEMO_TENANT_ID || '87e95cfd-1adc-4c30-9cd2-1d7cbcc85549',
      businessName: 'Test HVAC Company',
      profile: {
        industry: 'hvac' as const,
        serviceArea: ['43215', '43201', '43202'],
        businessHours: {
          weekdays: '8am-6pm',
          weekends: '9am-4pm',
          emergency: true,
          emergencyPhone: '+17407393487'
        },
        emergencyKeywords: ['emergency', 'urgent', 'broken', 'no heat', 'no ac'],
        routingConfig: {
          sales: '+17407393487',
          dispatch: '+17407393487',
          billing: '+17407393487'
        }
      }
    }
    
    console.log('📋 Test Configuration:')
    console.log(`   Business: ${testConfig.businessName}`)
    console.log(`   Industry: ${testConfig.profile.industry}`)
    console.log('')
    
    console.log('🎤 New Voice Settings:')
    console.log('   Max Tokens: 150 (was 250)')
    console.log('   Stability: 0.5 (was 0.55)')
    console.log('   Similarity Boost: 0.75 (was 0.78)')
    console.log('   First Message: "Hi, thanks for calling [Business Name]. What can I help you with today?"')
    console.log('')
    
    console.log('🚀 Calling provisionVapiAssistant...')
    const result = await provisionVapiAssistant(testConfig)
    
    console.log('✅ Provision API Response:')
    console.log(`   Success: ${result.success}`)
    console.log(`   Assistant ID: ${result.assistantId}`)
    console.log(`   Phone Number: ${result.phoneNumber}`)
    console.log(`   Phone Provisioning Failed: ${result.phoneProvisioningFailed}`)
    console.log(`   Error: ${result.error || 'None'}`)
    console.log('')
    
    if (result.success && result.assistantId) {
      console.log('🎉 Assistant created with new voice settings!')
      console.log('')
      console.log('🔗 Check the assistant in VAPI dashboard:')
      console.log(`   https://dashboard.vapi.ai/assistants/${result.assistantId}`)
      console.log('')
      console.log('📞 Test the phone number:')
      if (result.phoneNumber) {
        console.log(`   Call: ${result.phoneNumber}`)
        console.log('   Expected first message: "Hi, thanks for calling Test HVAC Company. What can I help you with today?"')
      } else {
        console.log('   No phone number provisioned')
      }
    } else {
      console.log('❌ Assistant creation failed')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testNewVoiceSettings()
