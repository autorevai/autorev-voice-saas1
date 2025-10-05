import { config } from 'dotenv'
import { VapiClient } from '@vapi-ai/server-sdk'

// Load environment variables
config({ path: '.env.local' })

async function fixAssistantConfig() {
  const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! })
  
  try {
    console.log('🔧 Fixing Assistant Configuration...')
    console.log('=' .repeat(50))
    
    const assistantId = '6d1baaae-37b8-4741-9d5b-6773c3b8f12f'
    
    console.log('🤖 Updating assistant configuration...')
    
    // Update the assistant with proper configuration
    const updatedAssistant = await vapi.assistants.update(assistantId, {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
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
- Use handoff_sms tool to transfer to emergency line

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
      },
      voice: {
        provider: 'elevenlabs',
        voiceId: '21m00Tcm4TlvDq8ikWAM'
      },
      transcriber: {
        provider: 'deepgram'
      },
      tools: [
        {
          type: 'function',
          function: {
            name: 'create_booking',
            description: 'Book a service appointment for a customer',
            parameters: {
              type: 'object',
              properties: {
                customer_name: { type: 'string', description: 'Customer full name' },
                phone: { type: 'string', description: 'Customer phone number' },
                address: { type: 'string', description: 'Service address' },
                service_type: { type: 'string', description: 'Type of service needed' },
                preferred_time: { type: 'string', description: 'Preferred appointment time' },
                notes: { type: 'string', description: 'Additional notes about the service' }
              },
              required: ['customer_name', 'phone', 'address', 'service_type']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'quote_estimate',
            description: 'Provide price estimates for common HVAC services',
            parameters: {
              type: 'object',
              properties: {
                service_type: { type: 'string', description: 'Type of service' },
                system_age: { type: 'string', description: 'Age of HVAC system' },
                property_size: { type: 'string', description: 'Size of property' }
              },
              required: ['service_type']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'handoff_sms',
            description: 'Transfer customer to human team member',
            parameters: {
              type: 'object',
              properties: {
                phone: { type: 'string', description: 'Customer phone number' },
                message: { type: 'string', description: 'Transfer message' },
                department: { type: 'string', description: 'Department to transfer to' }
              },
              required: ['phone', 'message']
            }
          }
        },
        {
          type: 'function',
          function: {
            name: 'update_crm_note',
            description: 'Log customer information and service history',
            parameters: {
              type: 'object',
              properties: {
                customer_name: { type: 'string', description: 'Customer name' },
                phone: { type: 'string', description: 'Customer phone' },
                notes: { type: 'string', description: 'Notes to log' }
              },
              required: ['customer_name', 'phone', 'notes']
            }
          }
        }
      ]
    });
    
    console.log('✅ Assistant updated successfully!')
    console.log(`   Name: ${updatedAssistant.name}`)
    console.log(`   Status: ${updatedAssistant.status}`)
    console.log(`   Model: ${updatedAssistant.model?.name}`)
    console.log(`   Tools: ${updatedAssistant.tools?.length || 0} tools`)
    console.log('')
    
    // Try to publish the assistant
    console.log('📢 Publishing assistant...')
    try {
      const publishedAssistant = await vapi.assistants.update(assistantId, {
        status: 'published'
      });
      console.log('✅ Assistant published successfully!')
      console.log(`   Status: ${publishedAssistant.status}`)
    } catch (publishError: any) {
      console.log('⚠️  Could not publish assistant:', publishError.message)
      console.log('   You may need to publish it manually in the dashboard')
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

fixAssistantConfig()
