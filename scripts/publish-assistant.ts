import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function publishAssistant() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('📢 Publishing Assistant...')
    console.log('=' .repeat(50))
    
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    // Try to publish the assistant
    console.log('🤖 Publishing assistant...')
    const publishedAssistant = await vapi.assistants.update(assistantId, {
      status: 'published'
    });
    
    console.log('✅ Assistant published successfully!')
    console.log(`   Name: ${publishedAssistant.name}`)
    console.log(`   Status: ${publishedAssistant.status}`)
    console.log(`   Model: ${publishedAssistant.model?.model}`)
    console.log(`   Tools: ${publishedAssistant.model?.toolIds?.length || 0} tools`)
    console.log('')
    
    console.log('🧪 Test the phone number now:')
    console.log('   📞 Call: +17403008194')
    console.log('   Say: "I need HVAC service"')
    console.log('   The AI should pick up and respond!')
    console.log('')
    console.log('🔗 Dashboard Links:')
    console.log(`   Assistant: https://dashboard.vapi.ai/assistants/${assistantId}`)
    console.log(`   Phone: https://dashboard.vapi.ai/phone-numbers/b523800f-31bb-41be-8dc9-05219cc5edcc`)
    
  } catch (error: any) {
    console.error('❌ Error publishing assistant:', error.message)
    console.error('Status:', error.statusCode)
    console.error('Body:', error.body)
    
    if (error.statusCode === 400) {
      console.log('')
      console.log('💡 The assistant might already be published or need manual publishing')
      console.log('   Go to the dashboard and check the assistant status')
      console.log(`   https://dashboard.vapi.ai/assistants/${assistantId}`)
    }
  }
}

publishAssistant()
