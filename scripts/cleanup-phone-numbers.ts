import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function cleanupPhoneNumbers() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔍 Fetching all phone numbers...')
    
    // List all phone numbers
    const phoneNumbers = await vapi.phoneNumbers.list()
    
    console.log(`📞 Found ${phoneNumbers.length} phone numbers:`)
    
    if (phoneNumbers.length === 0) {
      console.log('✅ No phone numbers found to clean up')
      return
    }
    
    // Display all phone numbers
    phoneNumbers.forEach((phone, index) => {
      console.log(`${index + 1}. ID: ${phone.id}`)
      console.log(`   Number: ${phone.number}`)
      console.log(`   Name: ${phone.name || 'Unnamed'}`)
      console.log(`   Assistant: ${phone.assistantId || 'None'}`)
      console.log('   ---')
    })
    
    // Filter for unlabeled/untitled numbers (not following our naming convention)
    const unlabeledNumbers = phoneNumbers.filter(phone => 
      !phone.name || 
      phone.name.toLowerCase().includes('untitled') ||
      phone.name.toLowerCase().includes('unlabeled') ||
      phone.name === '' ||
      // Also catch old naming patterns that don't follow our convention
      (!phone.name.includes('-') && !phone.name.includes('receptionist'))
    )
    
    console.log(`\n🗑️  Found ${unlabeledNumbers.length} unlabeled phone numbers to delete:`)
    
    if (unlabeledNumbers.length === 0) {
      console.log('✅ No unlabeled phone numbers found')
      return
    }
    
    // Delete unlabeled numbers
    for (const phone of unlabeledNumbers) {
      try {
        console.log(`🗑️  Deleting phone number ${phone.number} (ID: ${phone.id})...`)
        await vapi.phoneNumbers.delete(phone.id)
        console.log(`✅ Successfully deleted ${phone.number}`)
      } catch (error: any) {
        console.error(`❌ Failed to delete ${phone.number}:`, error.message)
      }
    }
    
    console.log('\n🎉 Phone number cleanup complete!')
    
  } catch (error: any) {
    console.error('❌ Error during cleanup:', error.message)
  }
}

// Run the cleanup
cleanupPhoneNumbers()
