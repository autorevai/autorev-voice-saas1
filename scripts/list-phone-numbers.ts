import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function listPhoneNumbers() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Fetching all phone numbers...')
    
    // List all phone numbers
    const phoneNumbers = await vapi.phoneNumbers.list()
    
    console.log(`📞 Found ${phoneNumbers.length} phone numbers:`)
    console.log('=' .repeat(50))
    
    if (phoneNumbers.length === 0) {
      console.log('✅ No phone numbers found')
      return
    }
    
    // Display all phone numbers with details
    phoneNumbers.forEach((phone, index) => {
      console.log(`${index + 1}. Phone Number: ${phone.number}`)
      console.log(`   ID: ${phone.id}`)
      console.log(`   Name: ${phone.name || 'Unnamed'}`)
      console.log(`   Assistant: ${phone.assistantId || 'None'}`)
      console.log(`   Provider: ${phone.provider || 'Unknown'}`)
      console.log(`   Status: ${phone.status || 'Unknown'}`)
      console.log('   ---')
    })
    
    // Identify unlabeled numbers
    const unlabeledNumbers = phoneNumbers.filter(phone => 
      !phone.name || 
      phone.name.toLowerCase().includes('untitled') ||
      phone.name.toLowerCase().includes('unlabeled') ||
      phone.name === ''
    )
    
    console.log(`\n🗑️  Unlabeled phone numbers (${unlabeledNumbers.length}):`)
    console.log('=' .repeat(50))
    
    if (unlabeledNumbers.length === 0) {
      console.log('✅ No unlabeled phone numbers found')
    } else {
      unlabeledNumbers.forEach((phone, index) => {
        console.log(`${index + 1}. ${phone.number} (ID: ${phone.id})`)
      })
      
      console.log(`\n💡 To delete these unlabeled numbers, run:`)
      console.log(`   npm run cleanup:phones`)
    }
    
  } catch (error: any) {
    console.error('❌ Error fetching phone numbers:', error.message)
  }
}

// Run the list
listPhoneNumbers()
