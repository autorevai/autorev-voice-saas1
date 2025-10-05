import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function fixAssistantSimple() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔧 Fixing Assistant Configuration (Simple)...')
    console.log('=' .repeat(50))
    
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    console.log('🤖 Updating assistant with correct VAPI format...')
    
    // Update the assistant with proper VAPI format
    const updatedAssistant = await vapi.assistants.update(assistantId, {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7
      },
      voice: {
        provider: '11labs',
        voiceId: '21m00Tcm4TlvDq8ikWAM'
      },
      transcriber: {
        provider: 'deepgram'
      },
      firstMessage: "Hello! Thank you for calling Test HVAC Company. How can I assist you with your HVAC needs today?",
      systemMessage: `You are Test HVAC Company's AI receptionist for HVAC services. Your primary goal is to efficiently book service appointments while identifying emergencies that need immediate attention.

IDENTITY & ROLE:
You represent a professional HVAC company specializing in heating, cooling, and air quality services. You're knowledgeable about common HVAC systems but never diagnose issues over the phone.

PRIMARY GOALS:
1. Book service appointments with complete customer information
2. Identify and prioritize emergency situations
3. Qualify leads for sales opportunities
4. Route complex issues to appropriate team members

EMERGENCY HANDLING:
- If customer mentions: "emergency", "urgent", "broken", "no heat", "no ac", "not working", "down"
- Immediately ask: "Is this an emergency situation?"
- For emergencies: "I understand this is urgent. Let me get you connected with our emergency dispatch team right away."

TOOLS AVAILABLE:
- create_booking: Book service appointments with customer details
- quote_estimate: Provide price estimates for common services
- handoff_sms: Transfer complex issues to human team members
- update_crm_note: Log customer information and service history

BOOKING FLOW:
1. Collect customer name, phone, address
2. Determine service type (repair, maintenance, installation)
3. Ask about preferred appointment time
4. Use create_booking tool to schedule
5. Provide confirmation number

Always be professional, helpful, and efficient. Focus on booking appointments and identifying emergencies.`
    });
    
    console.log('✅ Assistant updated successfully!')
    console.log(`   Name: ${updatedAssistant.name}`)
    console.log(`   Status: ${updatedAssistant.status}`)
    console.log(`   Model: ${updatedAssistant.model?.name}`)
    console.log('')
    
    // Check if we need to publish manually
    console.log('📢 Checking if assistant needs to be published...')
    if (updatedAssistant.status !== 'published') {
      console.log('⚠️  Assistant is not published yet')
      console.log('   You may need to publish it manually in the dashboard')
      console.log(`   Go to: https://dashboard.vapi.ai/assistants/${assistantId}`)
      console.log('   Click "Publish" button')
    } else {
      console.log('✅ Assistant is already published!')
    }
    
    console.log('')
    console.log('🧪 Test the phone number now:')
    console.log('   📞 Call: +17403008194')
    console.log('   Say: "I need HVAC service"')
    console.log('')
    console.log('🔗 Dashboard Links:')
    console.log(`   Assistant: https://dashboard.vapi.ai/assistants/${assistantId}`)
    console.log(`   Phone: https://dashboard.vapi.ai/phone-numbers/b523800f-31bb-41be-8dc9-05219cc5edcc`)
    
  } catch (error: any) {
    console.error('❌ Error fixing assistant:', error.message)
    console.error('Status:', error.statusCode)
    console.error('Body:', error.body)
  }
}

fixAssistantSimple()
