// scripts/test-dashboard-fix.ts
// Test that the dashboard fix works

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TENANT_ID = 'ba2ddf0a-d470-45ae-bf5a-fdf014b80a51' // Test 8 HVAC

async function testDashboardFix() {
  console.log('🧪 Testing dashboard fix...')
  
  try {
    // Test the user_tenants query that the dashboard now uses
    const { data: userTenants, error: userTenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id, user_id, role')
      .eq('tenant_id', TENANT_ID)
    
    if (userTenantError) {
      console.error('❌ User tenants query failed:', userTenantError)
      return
    }
    
    console.log('✅ User tenants query successful')
    console.log('📊 Found user-tenant relationships:', userTenants?.length || 0)
    
    if (userTenants && userTenants.length > 0) {
      console.log('👤 First user-tenant relationship:')
      console.log('   User ID:', userTenants[0].user_id)
      console.log('   Tenant ID:', userTenants[0].tenant_id)
      console.log('   Role:', userTenants[0].role)
    }
    
    // Test the old users table query (should fail)
    console.log('')
    console.log('🧪 Testing old users table query (should fail)...')
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', userTenants?.[0]?.user_id)
      .single()
    
    if (usersError) {
      console.log('✅ Old query failed as expected:', usersError.message)
    } else {
      console.log('⚠️ Old query unexpectedly succeeded')
    }
    
    console.log('')
    console.log('🎉 Dashboard fix verification complete!')
    console.log('The dashboard should now work with the user_tenants table.')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  }
}

testDashboardFix().catch(console.error)
