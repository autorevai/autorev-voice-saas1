import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function findPhoneNumber() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Finding the actual phone number...')
    console.log('=' .repeat(50))
    
    // Get all phone numbers
    const phones = await vapi.phoneNumbers.list()
    
    console.log(`📞 Found ${phones.length} phone numbers:`)
    console.log('')
    
    phones.forEach((phone, index) => {
      console.log(`${index + 1}. Phone Number Details:`)
      console.log(`   ID: ${phone.id}`)
      console.log(`   Number: ${phone.number || 'UNDEFINED'}`)
      console.log(`   Name: ${phone.name}`)
      console.log(`   Status: ${phone.status}`)
      console.log(`   Assistant: ${phone.assistantId}`)
      console.log(`   Provider: ${phone.provider}`)
      console.log(`   Created: ${phone.createdAt}`)
      console.log('')
    })
    
    // Look for our test phone specifically
    const testPhone = phones.find(p => p.name === 'test-hvac-company-hvac-2025-10-05')
    
    if (testPhone) {
      console.log('🎯 Found our test phone:')
      console.log(`   ID: ${testPhone.id}`)
      console.log(`   Number: ${testPhone.number || 'STILL UNDEFINED'}`)
      console.log(`   Name: ${testPhone.name}`)
      console.log(`   Status: ${testPhone.status}`)
      console.log('')
      
      if (testPhone.number) {
        console.log('✅ SUCCESS! Here\'s your phone number:')
        console.log(`   📞 Call: ${testPhone.number}`)
        console.log(`   🔗 Dashboard: https://dashboard.vapi.ai/phone-numbers/${testPhone.id}`)
        console.log('')
        console.log('🧪 Test Instructions:')
        console.log(`   1. Call: ${testPhone.number}`)
        console.log(`   2. Say: "I need HVAC service"`)
        console.log(`   3. Test booking: "I need an appointment"`)
        console.log(`   4. Test emergency: "My heat is broken"`)
        console.log(`   5. Should forward to: +17407393487`)
      } else {
        console.log('⚠️  Phone number field is still undefined')
        console.log('   This might be a VAPI API issue with free numbers')
        console.log('   Check the dashboard manually for the actual number')
      }
    } else {
      console.log('❌ Could not find our test phone number')
    }
    
    // Also check if there are any numbers with actual phone numbers
    const phonesWithNumbers = phones.filter(p => p.number && p.number !== 'undefined')
    
    if (phonesWithNumbers.length > 0) {
      console.log('')
      console.log('📱 Available phone numbers you can use:')
      phonesWithNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.number} (${phone.name})`)
      })
    }
    
  } catch (error: any) {
    console.error('❌ Error finding phone numbers:', error.message)
  }
}

findPhoneNumber()
