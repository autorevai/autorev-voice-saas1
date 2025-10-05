import { config } from 'dotenv'
import { createClient } from '../lib/supabase/client'

// Load environment variables
config({ path: '.env.local' })

async function debugTenantContext() {
  const supabase = createClient()
  
  try {
    console.log('🔍 Debugging Tenant Context...')
    console.log('=' .repeat(50))
    
    // 1. Check if user is authenticated
    console.log('👤 Step 1: Check Authentication')
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    
    if (!user) {
      console.log('❌ No authenticated user found')
      console.log('   This is why tenant context fails')
      console.log('   User needs to be logged in')
      return
    }
    
    console.log(`   ✅ Authenticated user: ${user.email} (${user.id})`)
    
    // 2. Test the exact tenant context query
    console.log('')
    console.log('🔗 Step 2: Test Tenant Context Query')
    const { data: userTenants, error: userTenantsError } = await supabase
      .from('user_tenants')
      .select('tenant_id, tenants(id, name, industry, phone)')
      .eq('user_id', user.id)
    
    if (userTenantsError) {
      console.error('❌ User tenants query failed:', userTenantsError)
      return
    }
    
    console.log(`   User-Tenant Relationships: ${userTenants.length}`)
    
    if (userTenants.length === 0) {
      console.log('   ❌ No tenant relationships found')
      console.log('   This is why currentTenant is null')
      return
    }
    
    userTenants.forEach((rel, index) => {
      const tenant = rel.tenants as any
      console.log(`   ${index + 1}. Tenant: ${tenant.name} (${rel.tenant_id})`)
    })
    
    // 3. Test the exact query that setup wizard uses
    console.log('')
    console.log('🧪 Step 3: Test Setup Wizard Query')
    const { data: setupQuery, error: setupError } = await supabase
      .from('users')
      .select('tenant_id, tenants(id, name)')
      .eq('id', user.id)
      .single()
    
    if (setupError) {
      console.error('❌ Setup wizard query failed:', setupError)
      console.log('   This is the query that setup wizard uses')
      return
    }
    
    console.log(`   ✅ Setup wizard query works`)
    console.log(`   Tenant ID: ${setupQuery.tenant_id}`)
    console.log(`   Tenant Name: ${(setupQuery.tenants as any)?.name || 'null'}`)
    
    // 4. Check if there's a mismatch between the two queries
    console.log('')
    console.log('🎯 Step 4: Compare Queries')
    console.log(`   Tenant Context Query: ${userTenants.length} results`)
    console.log(`   Setup Wizard Query: ${setupQuery.tenant_id ? 'Has tenant_id' : 'No tenant_id'}`)
    
    if (userTenants.length > 0 && !setupQuery.tenant_id) {
      console.log('   ❌ MISMATCH FOUND!')
      console.log('   Tenant context finds relationships, but setup wizard query returns null tenant_id')
      console.log('   This suggests the users table is missing tenant_id column or data')
    } else if (userTenants.length > 0 && setupQuery.tenant_id) {
      console.log('   ✅ Both queries work correctly')
    }
    
    // 5. Check the users table structure
    console.log('')
    console.log('📊 Step 5: Check Users Table Structure')
    const { data: userRecord, error: userRecordError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (userRecordError) {
      console.error('❌ Error fetching user record:', userRecordError)
    } else {
      console.log('   User record fields:')
      Object.keys(userRecord).forEach(key => {
        console.log(`      ${key}: ${userRecord[key]}`)
      })
    }
    
  } catch (error: any) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugTenantContext()
