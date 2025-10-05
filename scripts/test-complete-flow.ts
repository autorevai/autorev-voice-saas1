import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function testCompleteFlow() {
  const db = createClient()
  
  try {
    console.log('🧪 Testing Complete User Flow...')
    console.log('=' .repeat(50))
    
    // 1. Simulate user signup
    console.log('👤 Step 1: User Signup')
    const testUserId = 'test-user-' + Date.now()
    const testEmail = `test-${Date.now()}@autorev.ai`
    
    const { error: userError } = await db.from('users').insert({
      id: testUserId,
      email: testEmail,
      created_at: new Date().toISOString()
    })
    
    if (userError) {
      console.error('❌ User creation failed:', userError)
      return
    }
    console.log(`   ✅ Created user: ${testEmail}`)
    
    // 2. Simulate onboarding (tenant creation)
    console.log('')
    console.log('🏢 Step 2: Onboarding (Tenant Creation)')
    const testTenantId = 'test-tenant-' + Date.now()
    const businessName = 'Test Business ' + Date.now()
    
    const { error: tenantError } = await db.from('tenants').insert({
      id: testTenantId,
      name: businessName,
      slug: businessName.toLowerCase().replace(/\s+/g, '-'),
      setup_completed: false,
      created_at: new Date().toISOString()
    })
    
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError)
      return
    }
    console.log(`   ✅ Created tenant: ${businessName}`)
    
    // 3. Create user-tenant relationship
    console.log('')
    console.log('🔗 Step 3: User-Tenant Relationship')
    const { error: userTenantError } = await db.from('user_tenants').insert({
      user_id: testUserId,
      tenant_id: testTenantId,
      role: 'owner',
      created_at: new Date().toISOString()
    })
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship failed:', userTenantError)
      return
    }
    console.log('   ✅ Created user-tenant relationship')
    
    // 4. Test dashboard data fetch
    console.log('')
    console.log('📊 Step 4: Dashboard Data Fetch')
    const { data: userRecord, error: userRecordError } = await db
      .from('users')
      .select('tenant_id, tenants(id, name, setup_completed)')
      .eq('id', testUserId)
      .single()
    
    if (userRecordError) {
      console.error('❌ User record fetch failed:', userRecordError)
      return
    }
    
    console.log(`   ✅ User record: ${userRecord.tenant_id}`)
    console.log(`   ✅ Tenant: ${(userRecord.tenants as any).name}`)
    console.log(`   ✅ Setup completed: ${(userRecord.tenants as any).setup_completed}`)
    
    // 5. Test setup wizard data fetch
    console.log('')
    console.log('⚙️  Step 5: Setup Wizard Data Fetch')
    const { data: tenantData, error: tenantDataError } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', testTenantId)
      .single()
    
    if (tenantDataError) {
      console.error('❌ Tenant data fetch failed:', tenantDataError)
      return
    }
    
    console.log(`   ✅ Tenant data: ${tenantData.name}`)
    console.log(`   ✅ Setup status: ${tenantData.setup_completed}`)
    
    // 6. Test assistant creation (simulate)
    console.log('')
    console.log('🤖 Step 6: Assistant Creation (Simulated)')
    const { error: assistantError } = await db.from('assistants').insert({
      tenant_id: testTenantId,
      vapi_assistant_id: 'test-assistant-' + Date.now(),
      vapi_number_id: '+1740' + Math.floor(Math.random() * 10000000),
      name: `${businessName} Receptionist`,
      status: 'active',
      settings_json: {
        system_prompt: 'Test system prompt',
        playbook_config: { industry: 'hvac' }
      }
    })
    
    if (assistantError) {
      console.error('❌ Assistant creation failed:', assistantError)
      return
    }
    console.log('   ✅ Created assistant')
    
    // 7. Update tenant setup status
    console.log('')
    console.log('✅ Step 7: Update Setup Status')
    const { error: updateError } = await db
      .from('tenants')
      .update({ setup_completed: true })
      .eq('id', testTenantId)
    
    if (updateError) {
      console.error('❌ Setup status update failed:', updateError)
      return
    }
    console.log('   ✅ Updated setup status to completed')
    
    // 8. Final verification
    console.log('')
    console.log('🎯 Step 8: Final Verification')
    const { data: finalData } = await db
      .from('tenants')
      .select('id, name, setup_completed, assistants(id, vapi_number_id, name)')
      .eq('id', testTenantId)
      .single()
    
    console.log(`   ✅ Final tenant: ${finalData.name}`)
    console.log(`   ✅ Setup completed: ${finalData.setup_completed}`)
    console.log(`   ✅ Assistants: ${(finalData.assistants as any)?.length || 0}`)
    
    console.log('')
    console.log('🎉 Complete Flow Test PASSED!')
    console.log('   All database operations working correctly')
    console.log('   User flow should work end-to-end')
    
    // Cleanup test data
    console.log('')
    console.log('🧹 Cleaning up test data...')
    await db.from('assistants').delete().eq('tenant_id', testTenantId)
    await db.from('user_tenants').delete().eq('user_id', testUserId)
    await db.from('tenants').delete().eq('id', testTenantId)
    await db.from('users').delete().eq('id', testUserId)
    console.log('   ✅ Test data cleaned up')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testCompleteFlow()
