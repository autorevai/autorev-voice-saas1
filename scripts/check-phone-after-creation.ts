import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function checkPhoneAfterCreation() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Checking phone numbers after creation...')
    console.log('=' .repeat(50))
    
    // Get all phone numbers
    const phones = await vapi.phoneNumbers.list()
    
    console.log(`📞 Found ${phones.length} phone numbers:`)
    console.log('')
    
    phones.forEach((phone, index) => {
      console.log(`${index + 1}. Phone Number:`)
      console.log(`   ID: ${phone.id}`)
      console.log(`   Number: ${phone.number || 'UNDEFINED'}`)
      console.log(`   Name: ${phone.name || 'No name'}`)
      console.log(`   Status: ${phone.status}`)
      console.log(`   Provider: ${phone.provider}`)
      console.log(`   Assistant: ${phone.assistantId}`)
      console.log(`   Created: ${phone.createdAt}`)
      console.log('')
    })
    
    // Check if any have numbers now
    const phonesWithNumbers = phones.filter(p => p.number && p.number !== 'undefined')
    
    if (phonesWithNumbers.length > 0) {
      console.log('🎉 Found phone numbers with actual numbers:')
      phonesWithNumbers.forEach((phone, index) => {
        console.log(`   ${index + 1}. ${phone.number} (${phone.name || 'No name'})`)
        console.log(`      Assistant: ${phone.assistantId}`)
        console.log(`      Dashboard: https://dashboard.vapi.ai/phone-numbers/${phone.id}`)
      })
    } else {
      console.log('⚠️  No phone numbers have actual numbers assigned yet')
      console.log('   This might be a VAPI free number provisioning delay')
      console.log('   Check the VAPI dashboard manually for the actual numbers')
    }
    
    console.log('')
    console.log('🔗 VAPI Dashboard Links:')
    console.log('   Phone Numbers: https://dashboard.vapi.ai/phone-numbers')
    console.log('   Assistants: https://dashboard.vapi.ai/assistants')
    
  } catch (error: any) {
    console.error('❌ Error checking phone numbers:', error.message)
  }
}

checkPhoneAfterCreation()
