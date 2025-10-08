// scripts/sync-test8-user.ts
// Sync Test 8 user data to local development

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC
const ASSISTANT_ID = 'b59e17e9-6efd-4e6e-bc29-e078d3c362e6' // Test 8 Assistant

async function syncTest8User() {
  console.log('🔄 Syncing Test 8 user data...')
  console.log('   Tenant ID:', TENANT_ID)
  console.log('   Assistant ID:', ASSISTANT_ID)
  
  try {
    // Check if user_tenants relationship exists
    const { data: userTenants, error: utError } = await supabase
      .from('user_tenants')
      .select('user_id, tenant_id, role')
      .eq('tenant_id', TENANT_ID)
      .single()
    
    if (utError) {
      console.error('❌ No user-tenant relationship found:', utError.message)
      console.log('💡 This means the user needs to be created in the users table')
      return
    }
    
    console.log('✅ Found user-tenant relationship:')
    console.log('   User ID:', userTenants.user_id)
    console.log('   Role:', userTenants.role)
    
    // Check if user exists in users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('id, email, name, tenant_id')
      .eq('id', userTenants.user_id)
      .single()
    
    if (userError) {
      console.log('❌ User not found in users table, creating...')
      
      // Create the user record
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userTenants.user_id,
          email: 'test8@autorev.ai',
          name: 'Test 8 User',
          tenant_id: TENANT_ID
        })
        .select()
        .single()
      
      if (createError) {
        console.error('❌ Failed to create user:', createError)
        return
      }
      
      console.log('✅ User created successfully!')
      console.log('   User ID:', newUser.id)
      console.log('   Email:', newUser.email)
      
    } else {
      console.log('✅ User already exists in users table:')
      console.log('   User ID:', existingUser.id)
      console.log('   Email:', existingUser.email)
      console.log('   Tenant ID:', existingUser.tenant_id)
    }
    
    // Verify the assistant exists
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, name, vapi_assistant_id')
      .eq('id', ASSISTANT_ID)
      .single()
    
    if (assistantError) {
      console.log('⚠️ Assistant not found:', assistantError.message)
    } else {
      console.log('✅ Assistant found:')
      console.log('   Name:', assistant.name)
      console.log('   VAPI Assistant ID:', assistant.vapi_assistant_id)
    }
    
    console.log('')
    console.log('🎉 Test 8 sync complete!')
    console.log('The dashboard should now work at: http://localhost:3003/dashboard')
    
  } catch (error) {
    console.error('❌ Sync failed:', error)
  }
}

syncTest8User().catch(console.error)
