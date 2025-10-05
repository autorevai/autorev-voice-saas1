import { createClient } from '../lib/db'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function addWebhookColumn() {
  console.log('🔧 Adding webhook_url column to assistants table...')
  
  const db = createClient()
  
  try {
    // Add webhook_url column
    const { error: alterError } = await db.rpc('exec_sql', {
      sql: 'ALTER TABLE assistants ADD COLUMN IF NOT EXISTS webhook_url TEXT;'
    })
    
    if (alterError) {
      console.error('❌ Error adding column:', alterError)
      return
    }
    
    console.log('✅ webhook_url column added successfully!')
    
    // Update existing assistants with webhook URL
    const { error: updateError } = await db
      .from('assistants')
      .update({ 
        webhook_url: 'http://localhost:3001/api/vapi/webhook' 
      })
      .is('webhook_url', null)
    
    if (updateError) {
      console.error('❌ Error updating existing assistants:', updateError)
      return
    }
    
    console.log('✅ Existing assistants updated with webhook URL!')
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

addWebhookColumn()
