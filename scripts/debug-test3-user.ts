import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function debugTest3User() {
  const db = createClient()
  
  try {
    console.log('🔍 Debugging test3@autorev.ai User...')
    console.log('=' .repeat(60))
    
    // 1. Check if test3 user exists
    console.log('👤 Step 1: Check test3@autorev.ai user')
    const { data: testUser, error: userError } = await db
      .from('users')
      .select('id, email, name, tenant_id, created_at')
      .eq('email', 'test3@autorev.ai')
      .single()
    
    if (userError) {
      console.error('❌ test3@autorev.ai user not found:', userError)
      console.log('   This means the user signup failed or user is not in public.users table')
      return
    }
    
    console.log(`   ✅ Found user: ${testUser.email} (${testUser.id})`)
    console.log(`   Name: ${testUser.name}`)
    console.log(`   Tenant ID: ${testUser.tenant_id}`)
    console.log(`   Created: ${testUser.created_at}`)
    
    // 2. Check tenant details
    console.log('')
    console.log('🏢 Step 2: Check Tenant Details')
    if (!testUser.tenant_id) {
      console.log('   ❌ User has no tenant_id!')
      console.log('   This is why dashboard fails - user not linked to tenant')
      return
    }
    
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('id, name, slug, setup_completed, created_at')
      .eq('id', testUser.tenant_id)
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant not found:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})`)
    console.log(`   Slug: ${tenant.slug}`)
    console.log(`   Setup completed: ${tenant.setup_completed}`)
    console.log(`   Created: ${tenant.created_at}`)
    
    // 3. Check user-tenant relationship
    console.log('')
    console.log('🔗 Step 3: Check User-Tenant Relationship')
    const { data: userTenant, error: userTenantError } = await db
      .from('user_tenants')
      .select('user_id, tenant_id, role')
      .eq('user_id', testUser.id)
      .eq('tenant_id', testUser.tenant_id)
      .single()
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship not found:', userTenantError)
      console.log('   This could cause dashboard issues')
    } else {
      console.log(`   ✅ User-tenant relationship: ${userTenant.role}`)
    }
    
    // 4. Check assistants
    console.log('')
    console.log('🤖 Step 4: Check Assistants')
    const { data: assistants, error: assistantsError } = await db
      .from('assistants')
      .select('id, tenant_id, vapi_assistant_id, vapi_number_id, name, status, created_at')
      .eq('tenant_id', testUser.tenant_id)
      .order('created_at', { ascending: false })
    
    if (assistantsError) {
      console.error('❌ Error fetching assistants:', assistantsError)
    } else {
      console.log(`   Assistants found: ${assistants.length}`)
      assistants.forEach((assistant, index) => {
        console.log(`   ${index + 1}. ${assistant.name}`)
        console.log(`      VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
        console.log(`      VAPI Phone Number: ${assistant.vapi_number_id || 'None'}`)
        console.log(`      Status: ${assistant.status}`)
        console.log(`      Created: ${assistant.created_at}`)
      })
    }
    
    // 5. Test dashboard data fetch (simulate what dashboard does)
    console.log('')
    console.log('📊 Step 5: Test Dashboard Data Fetch')
    try {
      // This is the exact query the dashboard uses
      const { data: userRecord, error: userRecordError } = await db
        .from('users')
        .select('tenant_id, tenants(id, name, setup_completed)')
        .eq('id', testUser.id)
        .single()
      
      if (userRecordError) {
        console.error('❌ Dashboard data fetch failed:', userRecordError)
        console.log('   This is why dashboard shows "Error loading dashboard data"')
        return
      }
      
      console.log(`   ✅ Dashboard data fetch works`)
      console.log(`   Tenant ID: ${userRecord.tenant_id}`)
      console.log(`   Tenant Name: ${(userRecord.tenants as any).name}`)
      console.log(`   Setup Status: ${(userRecord.tenants as any).setup_completed}`)
      
    } catch (dashboardError: any) {
      console.error('❌ Dashboard simulation failed:', dashboardError.message)
    }
    
    // 6. Check for recent calls (dashboard needs this data)
    console.log('')
    console.log('📞 Step 6: Check Recent Calls Data')
    const { data: calls, error: callsError } = await db
      .from('calls')
      .select('id, started_at, ended_at, outcome, duration_sec')
      .eq('tenant_id', testUser.tenant_id)
      .order('started_at', { ascending: false })
      .limit(5)
    
    if (callsError) {
      console.error('❌ Error fetching calls:', callsError)
    } else {
      console.log(`   Recent calls: ${calls.length}`)
      calls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.started_at} - ${call.outcome} (${call.duration_sec}s)`)
      })
    }
    
    // 7. Summary and diagnosis
    console.log('')
    console.log('🎯 Diagnosis:')
    console.log(`   User exists: ✅`)
    console.log(`   Tenant exists: ${tenant ? '✅' : '❌'}`)
    console.log(`   User-tenant link: ${userTenant ? '✅' : '❌'}`)
    console.log(`   Assistants: ${assistants.length}`)
    console.log(`   VAPI phone numbers: ${assistants.filter(a => a.vapi_number_id).length}`)
    console.log(`   Setup completed: ${tenant.setup_completed}`)
    
    if (!tenant.setup_completed && assistants.length === 0) {
      console.log('')
      console.log('🔍 ISSUE FOUND:')
      console.log('   - User completed onboarding but setup is not complete')
      console.log('   - No assistants found in database')
      console.log('   - VAPI provisioning may have failed')
      console.log('   - Dashboard will show "Complete Your Setup"')
    } else if (tenant.setup_completed && assistants.length > 0) {
      console.log('')
      console.log('✅ SETUP COMPLETE:')
      console.log('   - User has completed setup')
      console.log('   - Assistant exists in database')
      console.log('   - Dashboard should show phone number')
    } else {
      console.log('')
      console.log('⚠️  PARTIAL SETUP:')
      console.log('   - Some setup completed but not everything')
      console.log('   - May need to complete setup wizard')
    }
    
  } catch (error: any) {
    console.error('❌ Debug failed:', error.message)
  }
}

debugTest3User()
