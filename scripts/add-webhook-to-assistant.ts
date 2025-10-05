import { VapiClient } from '@vapi-ai/server-sdk'
import { config } from 'dotenv'

config({ path: '.env.local' })

const vapi = new VapiClient(process.env.VAPI_API_KEY!)

async function addWebhookToAssistant() {
  try {
    const assistantId = process.argv[2]
    
    if (!assistantId) {
      console.error('❌ Please provide assistant ID as argument')
      console.log('Usage: npx tsx scripts/add-webhook-to-assistant.ts <assistant-id>')
      return
    }
    
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/vapi/webhook`
    const webhookSecret = process.env.WEBHOOK_SHARED_SECRET
    
    console.log('🔧 Adding webhook to assistant...')
    console.log(`Assistant ID: ${assistantId}`)
    console.log(`Webhook URL: ${webhookUrl}`)
    console.log(`Webhook Secret: ${webhookSecret ? '***' : 'NOT SET'}`)
    
    // Try to update the assistant with webhook configuration
    const response = await vapi.assistants.update(assistantId, {
      webhookUrl: webhookUrl,
      webhookSecret: webhookSecret
    })
    
    console.log('✅ Webhook added successfully!')
    console.log('Response:', JSON.stringify(response, null, 2))
    
  } catch (error: any) {
    console.error('❌ Error adding webhook:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  }
}

addWebhookToAssistant()
