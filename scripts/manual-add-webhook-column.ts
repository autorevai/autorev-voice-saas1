import { createClient } from '../lib/db'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function manualAddWebhookColumn() {
  console.log('🔧 Manually adding webhook_url column...')
  
  const db = createClient()
  
  try {
    // Try to add the column by inserting a test record with webhook_url
    console.log('📝 Testing webhook_url column...')
    
    // First, let's see if the column exists by trying to select it
    const { data: testData, error: testError } = await db
      .from('assistants')
      .select('webhook_url')
      .limit(1)
    
    if (testError && testError.code === 'PGRST204') {
      console.log('❌ webhook_url column does not exist')
      console.log('💡 You need to manually add this column in your Supabase dashboard:')
      console.log('   ALTER TABLE assistants ADD COLUMN webhook_url TEXT;')
      return
    }
    
    if (testError) {
      console.error('❌ Error testing column:', testError)
      return
    }
    
    console.log('✅ webhook_url column already exists!')
    console.log('📊 Current assistants with webhook URLs:')
    
    const { data: assistants } = await db
      .from('assistants')
      .select('id, name, webhook_url')
    
    if (assistants) {
      assistants.forEach(assistant => {
        console.log(`   - ${assistant.name}: ${assistant.webhook_url || 'NULL'}`)
      })
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message)
  }
}

manualAddWebhookColumn()
