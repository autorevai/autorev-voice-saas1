import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function checkDatabaseAssistant() {
  const db = createClient()
  
  try {
    console.log('🔍 Checking Database Assistant Records...')
    console.log('=' .repeat(50))
    
    // Get all assistants
    const { data: assistants, error } = await db
      .from('assistants')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('❌ Error fetching assistants:', error)
      return
    }
    
    console.log(`📊 Found ${assistants.length} assistants:`)
    console.log('')
    
    assistants.forEach((assistant, index) => {
      console.log(`${index + 1}. Assistant:`)
      console.log(`   ID: ${assistant.id}`)
      console.log(`   VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log(`   VAPI Number ID: ${assistant.vapi_number_id}`)
      console.log(`   Name: ${assistant.name}`)
      console.log(`   Status: ${assistant.status}`)
      console.log(`   Settings: ${JSON.stringify(assistant.settings_json, null, 2)}`)
      console.log('')
    })
    
    // Check if we have the test assistant
    const testAssistant = assistants.find(a => a.vapi_assistant_id === '6d1baaae-37b8-4741-9d5b-6773c3b8f12f')
    
    if (testAssistant) {
      console.log('🎯 Test Assistant Found:')
      console.log(`   Database ID: ${testAssistant.id}`)
      console.log(`   VAPI Assistant ID: ${testAssistant.vapi_assistant_id}`)
      console.log(`   VAPI Number ID: ${testAssistant.vapi_number_id}`)
      console.log(`   Name: ${testAssistant.name}`)
      console.log('')
      
      if (testAssistant.vapi_number_id) {
        console.log('✅ Phone number is stored in database')
        console.log(`   Phone: ${testAssistant.vapi_number_id}`)
      } else {
        console.log('⚠️  No phone number stored in database')
        console.log('   This might be why the dashboard shows no phone number')
      }
    } else {
      console.log('❌ Test assistant not found in database')
    }
    
  } catch (error: any) {
    console.error('❌ Error checking database:', error.message)
  }
}

checkDatabaseAssistant()
