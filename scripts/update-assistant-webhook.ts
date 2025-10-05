import { VapiClient } from '@vapi-ai/server-sdk'
import { config } from 'dotenv'

config({ path: '.env.local' })

const vapi = new VapiClient(process.env.VAPI_API_KEY!)

async function updateAssistantWebhook() {
  try {
    const assistantId = '92fd4bd6-f692-431b-8095-5711e5d5df34'
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/vapi/webhook`
    
    console.log('🔧 Updating assistant webhook...')
    console.log(`Assistant ID: ${assistantId}`)
    console.log(`Webhook URL: ${webhookUrl}`)
    
    // Update the assistant with webhook URL
    const response = await vapi.assistants.update(assistantId, {
      webhookUrl: webhookUrl,
      webhookSecret: process.env.WEBHOOK_SHARED_SECRET
    })
    
    console.log('✅ Assistant updated successfully!')
    console.log('Response:', JSON.stringify(response, null, 2))
    
  } catch (error: any) {
    console.error('❌ Error updating assistant:', error.message)
    if (error.response) {
      console.error('Response:', error.response.data)
    }
  }
}

updateAssistantWebhook()
