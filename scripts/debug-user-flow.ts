import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function debugUserFlow() {
  const db = createClient()
  
  try {
    console.log('🔍 Debugging User Flow Issues...')
    console.log('=' .repeat(50))
    
    // 1. Check all users
    console.log('👥 All Users:')
    const { data: users, error: usersError } = await db
      .from('users')
      .select('id, email, created_at')
      .order('created_at', { ascending: false })
    
    if (usersError) {
      console.error('❌ Error fetching users:', usersError)
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email} (${user.id}) - ${user.created_at}`)
      })
    }
    
    console.log('')
    
    // 2. Check all tenants
    console.log('🏢 All Tenants:')
    const { data: tenants, error: tenantsError } = await db
      .from('tenants')
      .select('id, name, slug, setup_completed, created_at')
      .order('created_at', { ascending: false })
    
    if (tenantsError) {
      console.error('❌ Error fetching tenants:', tenantsError)
    } else {
      tenants.forEach((tenant, index) => {
        console.log(`   ${index + 1}. ${tenant.name} (${tenant.id}) - Setup: ${tenant.setup_completed} - ${tenant.created_at}`)
      })
    }
    
    console.log('')
    
    // 3. Check user-tenant relationships
    console.log('🔗 User-Tenant Relationships:')
    const { data: userTenants, error: userTenantsError } = await db
      .from('user_tenants')
      .select('user_id, tenant_id, role, created_at')
      .order('created_at', { ascending: false })
    
    if (userTenantsError) {
      console.error('❌ Error fetching user_tenants:', userTenantsError)
    } else {
      userTenants.forEach((rel, index) => {
        console.log(`   ${index + 1}. User ${rel.user_id} → Tenant ${rel.tenant_id} (${rel.role}) - ${rel.created_at}`)
      })
    }
    
    console.log('')
    
    // 4. Check assistants
    console.log('🤖 All Assistants:')
    const { data: assistants, error: assistantsError } = await db
      .from('assistants')
      .select('id, tenant_id, vapi_assistant_id, vapi_number_id, name, status')
      .order('created_at', { ascending: false })
    
    if (assistantsError) {
      console.error('❌ Error fetching assistants:', assistantsError)
    } else {
      assistants.forEach((assistant, index) => {
        console.log(`   ${index + 1}. ${assistant.name} (${assistant.vapi_assistant_id}) - Phone: ${assistant.vapi_number_id} - Tenant: ${assistant.tenant_id}`)
      })
    }
    
    console.log('')
    
    // 5. Check for orphaned data
    console.log('🔍 Checking for Issues:')
    
    // Users without tenants
    const usersWithoutTenants = users?.filter(user => 
      !userTenants?.some(ut => ut.user_id === user.id)
    ) || []
    
    if (usersWithoutTenants.length > 0) {
      console.log('   ⚠️  Users without tenant relationships:')
      usersWithoutTenants.forEach(user => {
        console.log(`      - ${user.email} (${user.id})`)
      })
    }
    
    // Tenants without users
    const tenantsWithoutUsers = tenants?.filter(tenant => 
      !userTenants?.some(ut => ut.tenant_id === tenant.id)
    ) || []
    
    if (tenantsWithoutUsers.length > 0) {
      console.log('   ⚠️  Tenants without user relationships:')
      tenantsWithoutUsers.forEach(tenant => {
        console.log(`      - ${tenant.name} (${tenant.id})`)
      })
    }
    
    // Assistants with phone numbers
    const assistantsWithPhones = assistants?.filter(a => a.vapi_number_id) || []
    if (assistantsWithPhones.length > 0) {
      console.log('   📞 Assistants with phone numbers:')
      assistantsWithPhones.forEach(assistant => {
        console.log(`      - ${assistant.name}: ${assistant.vapi_number_id}`)
      })
    }
    
    console.log('')
    console.log('🎯 Recommendations:')
    console.log('   1. Clean up orphaned data')
    console.log('   2. Fix user-tenant relationships')
    console.log('   3. Reset setup_completed flags')
    console.log('   4. Test fresh user flow')
    
  } catch (error: any) {
    console.error('❌ Debug error:', error.message)
  }
}

debugUserFlow()
