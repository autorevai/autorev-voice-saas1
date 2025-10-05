import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function testCurrentUser() {
  const db = createClient()
  
  try {
    console.log('🔍 Testing Current User State...')
    console.log('=' .repeat(50))
    
    // Get the most recent user (test@autorev.ai)
    const { data: recentUser, error: userError } = await db
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (userError) {
      console.error('❌ Error fetching recent user:', userError)
      return
    }
    
    console.log(`👤 Recent User: ${recentUser.email} (${recentUser.id})`)
    
    // Check user-tenant relationships for this user
    const { data: userTenants, error: userTenantsError } = await db
      .from('user_tenants')
      .select('tenant_id, role, tenants(id, name, setup_completed)')
      .eq('user_id', recentUser.id)
    
    if (userTenantsError) {
      console.error('❌ Error fetching user tenants:', userTenantsError)
      return
    }
    
    console.log(`🔗 User-Tenant Relationships: ${userTenants.length}`)
    
    if (userTenants.length === 0) {
      console.log('   ❌ No tenant relationships found!')
      console.log('   This is why setup wizard shows "No tenant found"')
      return
    }
    
    userTenants.forEach((rel, index) => {
      const tenant = rel.tenants as any
      console.log(`   ${index + 1}. Tenant: ${tenant.name} (${rel.tenant_id})`)
      console.log(`      Role: ${rel.role}`)
      console.log(`      Setup: ${tenant.setup_completed}`)
    })
    
    // Test the exact query that tenant context uses
    console.log('')
    console.log('🧪 Testing Tenant Context Query...')
    const { data: contextQuery, error: contextError } = await db
      .from('user_tenants')
      .select('tenant_id, tenants(id, name, industry, phone)')
      .eq('user_id', recentUser.id)
    
    if (contextError) {
      console.error('❌ Context query failed:', contextError)
    } else {
      console.log(`   ✅ Context query returned ${contextQuery.length} results`)
      contextQuery.forEach((item, index) => {
        const tenant = item.tenants as any
        console.log(`      ${index + 1}. ${tenant.name} (${item.tenant_id})`)
      })
    }
    
    console.log('')
    console.log('🎯 Diagnosis:')
    if (userTenants.length > 0) {
      console.log('   ✅ User has tenant relationships')
      console.log('   ✅ Tenant context should work')
      console.log('   🔍 Check if user is properly authenticated in browser')
    } else {
      console.log('   ❌ User has no tenant relationships')
      console.log('   🔧 Need to create user-tenant relationship')
    }
    
  } catch (error: any) {
    console.error('❌ Test error:', error.message)
  }
}

testCurrentUser()
