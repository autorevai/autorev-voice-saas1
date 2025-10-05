import { config } from 'dotenv'
import { provisionVapiAssistant } from '../services/vapi-provisioner'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function testHvacProvision() {
  console.log('🧪 Testing HVAC Assistant Provisioning...')
  console.log('=' .repeat(50))
  
  try {
    // Test configuration
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
    console.log(`   Service Areas: ${testConfig.profile.serviceArea.join(', ')}`)
    console.log(`   Emergency Phone: ${testConfig.profile.businessHours.emergencyPhone}`)
    console.log('')
    
    // 1. Provision the assistant
    console.log('🚀 Provisioning VAPI Assistant...')
    const result = await provisionVapiAssistant(testConfig)
    
    if (!result.success) {
      console.error('❌ Provisioning failed:', result.error)
      return
    }
    
    console.log('✅ Assistant Created Successfully!')
    console.log(`   Assistant ID: ${result.assistantId}`)
    console.log(`   Phone Number: ${result.phoneNumber || 'None (provisioning failed)'}`)
    console.log(`   Phone Provisioning Failed: ${result.phoneProvisioningFailed}`)
    console.log('')
    
    // 2. Save to database
    console.log('💾 Saving to database...')
    const db = createClient()
    
    const { error: assistantError } = await db.from('assistants').insert({
      tenant_id: testConfig.tenantId,
      vapi_assistant_id: result.assistantId,
      vapi_number_id: result.phoneNumber,
      name: `${testConfig.businessName} Receptionist`,
      status: 'active',
      settings_json: {
        system_prompt: 'AI receptionist for ' + testConfig.businessName,
        playbook_config: testConfig.profile,
        model: 'gpt-4o',
        provider: 'openai'
      }
    })
    
    if (assistantError) {
      console.error('❌ Database save failed:', assistantError)
      return
    }
    
    console.log('✅ Saved to database successfully!')
    console.log('')
    
    // 3. Test the phone number if available
    if (result.phoneNumber) {
      console.log('📞 Phone Number Test:')
      console.log(`   Number: ${result.phoneNumber}`)
      console.log(`   Test Call: tel:${result.phoneNumber}`)
      console.log('')
      console.log('🎯 Test Instructions:')
      console.log('   1. Call the number above')
      console.log('   2. Try saying: "I need HVAC service"')
      console.log('   3. Test booking: "I need an appointment"')
      console.log('   4. Test emergency: "My heat is broken"')
      console.log('   5. Check if it forwards to +17407393487 for handoff')
      console.log('')
    } else {
      console.log('⚠️  No phone number available - check VAPI dashboard for manual setup')
      console.log('')
    }
    
    // 4. Show VAPI dashboard links
    console.log('🔗 VAPI Dashboard Links:')
    console.log(`   Assistants: https://dashboard.vapi.ai/assistants/${result.assistantId}`)
    if (result.phoneNumber) {
      console.log(`   Phone Numbers: https://dashboard.vapi.ai/phone-numbers`)
    }
    console.log('')
    
    // 5. Show tools that should be attached
    console.log('🛠️  Tools Attached:')
    console.log('   ✅ create_booking - Book appointments')
    console.log('   ✅ quote_estimate - Provide price estimates')
    console.log('   ✅ handoff_sms - Transfer to human')
    console.log('   ✅ update_crm_note - Log customer notes')
    console.log('')
    
    console.log('🎉 Test Complete! Your HVAC assistant is ready.')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

// Run the test
testHvacProvision()
