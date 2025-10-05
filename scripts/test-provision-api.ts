import { config } from 'dotenv'
import { provisionVapiAssistant } from '../services/vapi-provisioner'

// Load environment variables
config({ path: '.env.local' })

async function testProvisionApi() {
  try {
    console.log('🧪 Testing Provision API Response...')
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
    
    console.log('🚀 Calling provisionVapiAssistant...')
    const result = await provisionVapiAssistant(testConfig)
    
    console.log('✅ Provision API Response:')
    console.log(`   Success: ${result.success}`)
    console.log(`   Assistant ID: ${result.assistantId}`)
    console.log(`   Phone Number: ${result.phoneNumber}`)
    console.log(`   Phone Provisioning Failed: ${result.phoneProvisioningFailed}`)
    console.log(`   Error: ${result.error || 'None'}`)
    console.log('')
    
    if (result.phoneNumber) {
      console.log('🎉 Phone number will be saved to database!')
    } else {
      console.log('⚠️  No phone number - will save null to database')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testProvisionApi()
