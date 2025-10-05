import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function cleanupTestData() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  const db = createClient()
  
  try {
    console.log('🧹 Cleaning up test data...')
    console.log('=' .repeat(50))
    
    // 1. Delete test phone numbers
    console.log('📞 Deleting test phone numbers...')
    const phones = await vapi.phoneNumbers.list()
    const testPhones = phones.filter(p => 
      p.name?.includes('test-hvac-company') || 
      p.name?.includes('test-phone')
    )
    
    for (const phone of testPhones) {
      try {
        await vapi.phoneNumbers.delete(phone.id)
        console.log(`   ✅ Deleted phone: ${phone.number} (${phone.name})`)
      } catch (error: any) {
        console.log(`   ⚠️  Could not delete phone ${phone.id}: ${error.message}`)
      }
    }
    
    // 2. Delete test assistants
    console.log('🤖 Deleting test assistants...')
    const assistants = await vapi.assistants.list()
    const testAssistants = assistants.filter(a => 
      a.name?.includes('Test HVAC Company') ||
      a.name?.includes('test hvac')
    )
    
    for (const assistant of testAssistants) {
      try {
        await vapi.assistants.delete(assistant.id)
        console.log(`   ✅ Deleted assistant: ${assistant.name} (${assistant.id})`)
      } catch (error: any) {
        console.log(`   ⚠️  Could not delete assistant ${assistant.id}: ${error.message}`)
      }
    }
    
    // 3. Clean up database assistants
    console.log('🗄️  Cleaning up database assistants...')
    const { error: deleteError } = await db
      .from('assistants')
      .delete()
      .like('name', '%test%')
    
    if (deleteError) {
      console.log(`   ⚠️  Database cleanup error: ${deleteError.message}`)
    } else {
      console.log('   ✅ Deleted test assistants from database')
    }
    
    console.log('')
    console.log('🎉 Cleanup complete!')
    console.log('   Ready for fresh test of the complete flow')
    
  } catch (error: any) {
    console.error('❌ Cleanup error:', error.message)
  }
}

cleanupTestData()
