import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function battleTestFlow() {
  const db = createClient()
  
  try {
    console.log('🔍 Battle Testing Complete Flow...')
    console.log('=' .repeat(50))
    
    // 1. Check if test2@autorev.ai user exists
    console.log('👤 Step 1: Check test2@autorev.ai user')
    const { data: testUser, error: userError } = await db
      .from('users')
      .select('id, email, created_at')
      .eq('email', 'test2@autorev.ai')
      .single()
    
    if (userError) {
      console.error('❌ test2@autorev.ai user not found:', userError)
      console.log('   This means the user signup failed or user is in auth.users but not in public.users')
      return
    }
    
    console.log(`   ✅ Found user: ${testUser.email} (${testUser.id})`)
    console.log(`   Created: ${testUser.created_at}`)
    
    // 2. Check user-tenant relationships for this specific user
    console.log('')
    console.log('🔗 Step 2: Check User-Tenant Relationships')
    const { data: userTenants, error: userTenantsError } = await db
      .from('user_tenants')
      .select('tenant_id, role, tenants(id, name, setup_completed)')
      .eq('user_id', testUser.id)
    
    if (userTenantsError) {
      console.error('❌ Error fetching user tenants:', userTenantsError)
      return
    }
    
    console.log(`   User-Tenant Relationships: ${userTenants.length}`)
    
    if (userTenants.length === 0) {
      console.log('   ❌ NO TENANT RELATIONSHIPS FOUND!')
      console.log('   This is why setup wizard shows "No tenant found"')
      console.log('   The onboarding process failed to create user-tenant relationship')
      return
    }
    
    userTenants.forEach((rel, index) => {
      const tenant = rel.tenants as any
      console.log(`   ${index + 1}. Tenant: ${tenant.name} (${rel.tenant_id})`)
      console.log(`      Role: ${rel.role}`)
      console.log(`      Setup: ${tenant.setup_completed}`)
    })
    
    // 3. Check if tenant exists and is properly configured
    console.log('')
    console.log('🏢 Step 3: Check Tenant Details')
    const tenantId = userTenants[0].tenant_id
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('id, name, slug, setup_completed, created_at')
      .eq('id', tenantId)
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant not found:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})`)
    console.log(`   Slug: ${tenant.slug}`)
    console.log(`   Setup: ${tenant.setup_completed}`)
    console.log(`   Created: ${tenant.created_at}`)
    
    // 4. Test the exact query that setup wizard uses
    console.log('')
    console.log('🧪 Step 4: Test Setup Wizard Query')
    const { data: setupQuery, error: setupError } = await db
      .from('users')
      .select('tenant_id, tenants(id, name)')
      .eq('id', testUser.id)
      .single()
    
    if (setupError) {
      console.error('❌ Setup wizard query failed:', setupError)
      console.log('   This is the exact query that fails in setup wizard')
      return
    }
    
    console.log(`   ✅ Setup wizard query works`)
    console.log(`   Tenant ID: ${setupQuery.tenant_id}`)
    console.log(`   Tenant Name: ${(setupQuery.tenants as any).name}`)
    
    // 5. Test tenant context query (what useTenant hook uses)
    console.log('')
    console.log('🎯 Step 5: Test Tenant Context Query')
    const { data: contextQuery, error: contextError } = await db
      .from('user_tenants')
      .select('tenant_id, tenants(id, name, industry, phone)')
      .eq('user_id', testUser.id)
    
    if (contextError) {
      console.error('❌ Tenant context query failed:', contextError)
      console.log('   This is why useTenant hook returns null')
      return
    }
    
    console.log(`   ✅ Tenant context query works`)
    console.log(`   Results: ${contextQuery.length}`)
    contextQuery.forEach((item, index) => {
      const tenant = item.tenants as any
      console.log(`      ${index + 1}. ${tenant.name} (${item.tenant_id})`)
    })
    
    // 6. Check if there are any assistants for this tenant
    console.log('')
    console.log('🤖 Step 6: Check Assistants')
    const { data: assistants, error: assistantsError } = await db
      .from('assistants')
      .select('id, tenant_id, vapi_assistant_id, vapi_number_id, name, status')
      .eq('tenant_id', tenantId)
    
    if (assistantsError) {
      console.error('❌ Error fetching assistants:', assistantsError)
    } else {
      console.log(`   Assistants: ${assistants.length}`)
      assistants.forEach((assistant, index) => {
        console.log(`      ${index + 1}. ${assistant.name} - Phone: ${assistant.vapi_number_id || 'None'}`)
      })
    }
    
    // 7. Final diagnosis
    console.log('')
    console.log('🎯 Final Diagnosis:')
    
    if (userTenants.length > 0) {
      console.log('   ✅ User has tenant relationships')
      console.log('   ✅ Tenant context should work')
      console.log('   ✅ Setup wizard should work')
      console.log('')
      console.log('   🔍 If still getting "No tenant found" error:')
      console.log('   1. Check browser console for JavaScript errors')
      console.log('   2. Check if user is properly authenticated')
      console.log('   3. Try hard refresh (Cmd+Shift+R)')
      console.log('   4. Check if useTenant hook is loading correctly')
    } else {
      console.log('   ❌ User has no tenant relationships')
      console.log('   🔧 Need to fix onboarding process')
      console.log('   The issue is in the onboarding action')
    }
    
  } catch (error: any) {
    console.error('❌ Battle test failed:', error.message)
  }
}

battleTestFlow()
