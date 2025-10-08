// scripts/fix-test8-user.ts
// Ensure Test 8 user exists in the database

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC

async function fixTest8User() {
  console.log('🔧 Fixing Test 8 user record...')
  
  try {
    // First, let's see what users exist
    const { data: existingUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, tenant_id')
      .eq('tenant_id', TENANT_ID)
    
    if (usersError) {
      console.error('❌ Failed to query users:', usersError)
      return
    }
    
    console.log('📊 Existing users for Test 8 tenant:', existingUsers?.length || 0)
    
    if (existingUsers && existingUsers.length > 0) {
      console.log('✅ User already exists:', existingUsers[0].email)
      console.log('   User ID:', existingUsers[0].id)
      console.log('   Tenant ID:', existingUsers[0].tenant_id)
      return
    }
    
    // Create a test user for Test 8 tenant
    console.log('👤 Creating test user for Test 8...')
    const testUserId = 'c5410bac-30d1-421f-b901-0a88f8d30f2b' // Use the user ID from user_tenants
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: testUserId,
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
    
    console.log('✅ Test user created successfully!')
    console.log('   User ID:', newUser.id)
    console.log('   Email:', newUser.email)
    console.log('   Tenant ID:', newUser.tenant_id)
    
    console.log('')
    console.log('🎉 Test 8 user setup complete!')
    console.log('The dashboard should now work for test8@autorev.ai')
    
  } catch (error) {
    console.error('❌ Setup failed:', error)
  }
}

fixTest8User().catch(console.error)
