import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function updateAssistantPhone() {
  const db = createClient()
  
  try {
    console.log('🔧 Updating Assistant Phone Number...')
    console.log('=' .repeat(50))
    
    // Update the test assistant with the phone number
    const { error } = await db
      .from('assistants')
      .update({ 
        vapi_number_id: '+17403008197' 
      })
      .eq('vapi_assistant_id', '6d1baaae-37b8-4741-9d5b-6773c3b8f12f')
    
    if (error) {
      console.error('❌ Error updating assistant:', error)
      return
    }
    
    console.log('✅ Assistant phone number updated!')
    console.log('   Phone: +17403008197')
    console.log('   Assistant ID: 6d1baaae-37b8-4741-9d5b-6773c3b8f12f')
    console.log('')
    
    // Verify the update
    const { data: assistant } = await db
      .from('assistants')
      .select('*')
      .eq('vapi_assistant_id', '6d1baaae-37b8-4741-9d5b-6773c3b8f12f')
      .single()
    
    if (assistant) {
      console.log('📊 Updated Assistant:')
      console.log(`   Name: ${assistant.name}`)
      console.log(`   VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log(`   VAPI Number ID: ${assistant.vapi_number_id}`)
      console.log(`   Status: ${assistant.status}`)
    }
    
    console.log('')
    console.log('🧪 Test the phone number now:')
    console.log('   📞 Call: +17403008197')
    console.log('   Say: "I need HVAC service"')
    console.log('')
    console.log('🔗 Dashboard Links:')
    console.log('   Assistant: https://dashboard.vapi.ai/assistants/6d1baaae-37b8-4741-9d5b-6773c3b8f12f')
    console.log('   Phone: https://dashboard.vapi.ai/phone-numbers')
    
  } catch (error: any) {
    console.error('❌ Error updating assistant:', error.message)
  }
}

updateAssistantPhone()
