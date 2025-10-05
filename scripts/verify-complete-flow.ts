import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function verifyCompleteFlow() {
  const db = createClient()
  
  try {
    console.log('🔍 Verifying Complete User Flow...')
    console.log('=' .repeat(50))
    
    // 1. Check test2@autorev.ai user and tenant
    console.log('👤 Step 1: Check test2@autorev.ai user')
    const { data: testUser, error: userError } = await db
      .from('users')
      .select('id, email, tenant_id')
      .eq('email', 'test2@autorev.ai')
      .single()
    
    if (userError) {
      console.error('❌ User not found:', userError)
      return
    }
    
    console.log(`   ✅ User: ${testUser.email} (${testUser.id})`)
    console.log(`   ✅ Tenant ID: ${testUser.tenant_id}`)
    
    // 2. Check tenant details
    console.log('')
    console.log('🏢 Step 2: Check Tenant Details')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', testUser.tenant_id)
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant not found:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant: ${tenant.name} (${tenant.id})`)
    console.log(`   ✅ Setup Completed: ${tenant.setup_completed}`)
    
    // 3. Check assistant
    console.log('')
    console.log('🤖 Step 3: Check Assistant')
    const { data: assistant, error: assistantError } = await db
      .from('assistants')
      .select('id, vapi_assistant_id, vapi_number_id, name, status')
      .eq('tenant_id', testUser.tenant_id)
      .single()
    
    if (assistantError) {
      console.error('❌ Assistant not found:', assistantError)
      console.log('   This means VAPI provisioning failed')
      return
    }
    
    console.log(`   ✅ Assistant: ${assistant.name}`)
    console.log(`   ✅ VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
    console.log(`   ✅ VAPI Phone Number: ${assistant.vapi_number_id || 'None (provisioning failed)'}`)
    console.log(`   ✅ Status: ${assistant.status}`)
    
    // 4. Check user-tenant relationship
    console.log('')
    console.log('🔗 Step 4: Check User-Tenant Relationship')
    const { data: userTenant, error: userTenantError } = await db
      .from('user_tenants')
      .select('user_id, tenant_id, role')
      .eq('user_id', testUser.id)
      .eq('tenant_id', testUser.tenant_id)
      .single()
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship not found:', userTenantError)
      return
    }
    
    console.log(`   ✅ User-Tenant Relationship: ${userTenant.role}`)
    
    // 5. Summary
    console.log('')
    console.log('🎯 Summary:')
    console.log(`   User: ${testUser.email}`)
    console.log(`   Tenant: ${tenant.name}`)
    console.log(`   Setup: ${tenant.setup_completed ? '✅ Complete' : '❌ Incomplete'}`)
    console.log(`   Assistant: ${assistant.name}`)
    console.log(`   Phone: ${assistant.vapi_number_id ? '✅ Provisioned' : '❌ Failed'}`)
    
    if (assistant.vapi_number_id) {
      console.log('')
      console.log('🎉 SUCCESS: Complete flow working!')
      console.log(`   Phone Number: ${assistant.vapi_number_id}`)
      console.log(`   Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log('   Dashboard should show phone number')
    } else {
      console.log('')
      console.log('⚠️  PARTIAL SUCCESS: Assistant created but phone failed')
      console.log('   Dashboard will show "Complete Your Setup"')
      console.log('   Phone provisioning needs to be fixed')
    }
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message)
  }
}

verifyCompleteFlow()
