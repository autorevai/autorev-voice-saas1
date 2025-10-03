import { createClient } from '@/lib/supabase/server'

interface AssistantConfig {
  tenantId: string
  businessName: string
  industry: string
  phone: string
  serviceArea: string
  hoursOfOperation?: string
}

export async function provisionVapiAssistant(config: AssistantConfig) {
  const VAPI_API_KEY = process.env.VAPI_API_KEY
  const VAPI_ORG_ID = process.env.VAPI_ORG_ID
  
  if (!VAPI_API_KEY || !VAPI_ORG_ID) {
    console.warn('VAPI credentials not configured - skipping assistant provisioning')
    return {
      success: false,
      error: 'VAPI_API_KEY or VAPI_ORG_ID not set',
      assistantId: null,
      phoneNumber: null
    }
  }

  try {
    // Build knowledge base with tenant-specific info
    const knowledgeBase = buildKnowledgeBase(config)
    
    // Create VAPI Assistant
    const assistantResponse = await fetch('https://api.vapi.ai/assistant', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VAPI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `${config.businessName} Voice AI`,
        model: {
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          temperature: 0.7,
          systemPrompt: knowledgeBase,
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
        },
        functions: [
          {
            name: 'create_booking',
            description: 'Books an appointment',
            parameters: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                phone: { type: 'string' },
                address: { type: 'string' },
                job_type: { type: 'string' },
              },
              required: ['name', 'phone', 'address'],
            },
          },
        ],
        serverUrl: `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/tools`,
        serverUrlSecret: process.env.WEBHOOK_SHARED_SECRET,
      }),
    })

    if (!assistantResponse.ok) {
      const error = await assistantResponse.text()
      throw new Error(`VAPI API error: ${error}`)
    }

    const assistant = await assistantResponse.json()

    // Save assistant to database
    const supabase = await createClient()
    await supabase.from('assistants').insert({
      tenant_id: config.tenantId,
      vapi_assistant_id: assistant.id,
      name: assistant.name,
      status: 'active',
      config: assistant,
    })

    return {
      success: true,
      assistantId: assistant.id,
      phoneNumber: null, // Phone number purchase would go here
    }
  } catch (error: any) {
    console.error('VAPI provisioning error:', error)
    return {
      success: false,
      error: error.message,
      assistantId: null,
      phoneNumber: null,
    }
  }
}

function buildKnowledgeBase(config: AssistantConfig): string {
  return `You are a helpful AI receptionist for ${config.businessName}, a ${config.industry} company.

Business Information:
- Company: ${config.businessName}
- Industry: ${config.industry}
- Phone: ${config.phone}
- Service Area: ${config.serviceArea}
${config.hoursOfOperation ? `- Hours: ${config.hoursOfOperation}` : ''}

Your role is to:
1. Answer questions about services
2. Schedule appointments using the create_booking tool
3. Provide pricing estimates using the quote_estimate tool
4. Transfer complex inquiries using the handoff_sms tool

Always be friendly, professional, and helpful. If unsure, offer to have a human call back.`
}
