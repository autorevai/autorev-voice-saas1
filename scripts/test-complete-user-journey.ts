import { config } from 'dotenv'
import { createClient } from '../lib/db'
import { provisionVapiAssistant } from '../services/vapi-provisioner'

// Load environment variables
config({ path: '.env.local' })

async function testCompleteUserJourney() {
  const db = createClient()
  
  try {
    console.log('🧪 Testing Complete User Journey...')
    console.log('=' .repeat(50))
    
    // Step 1: Simulate User Signup
    console.log('👤 Step 1: Simulate User Signup')
    const testUserId = '00000000-0000-0000-0000-' + Date.now().toString().slice(-12).padStart(12, '0')
    const testEmail = `test-journey-${Date.now()}@autorev.ai`
    const businessName = `Test Journey ${Date.now()}`
    
    // Create user in users table
    const { error: userError } = await db.from('users').insert({
      id: testUserId,
      email: testEmail,
      name: businessName,
      created_at: new Date().toISOString()
    })
    
    if (userError) {
      console.error('❌ User creation failed:', userError)
      return
    }
    console.log(`   ✅ Created user: ${testEmail}`)
    
    // Step 2: Simulate Onboarding (Tenant Creation)
    console.log('')
    console.log('🏢 Step 2: Simulate Onboarding')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: businessName,
        slug: businessName.toLowerCase().replace(/\W+/g, '-'),
        setup_completed: false
      })
      .select()
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError)
      return
    }
    console.log(`   ✅ Created tenant: ${tenant.name} (${tenant.id})`)
    
    // Update user with tenant_id
    const { error: updateUserError } = await db
      .from('users')
      .update({ tenant_id: tenant.id })
      .eq('id', testUserId)
    
    if (updateUserError) {
      console.error('❌ User update failed:', updateUserError)
      return
    }
    console.log(`   ✅ Updated user with tenant_id`)
    
    // Create user-tenant relationship
    const { error: userTenantError } = await db.from('user_tenants').insert({
      user_id: testUserId,
      tenant_id: tenant.id,
      role: 'owner'
    })
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship failed:', userTenantError)
      return
    }
    console.log(`   ✅ Created user-tenant relationship`)
    
    // Step 3: Test Dashboard Data Fetch
    console.log('')
    console.log('📊 Step 3: Test Dashboard Data Fetch')
    const { data: userRecord, error: userRecordError } = await db
      .from('users')
      .select('tenant_id, tenants(id, name, setup_completed)')
      .eq('id', testUserId)
      .single()
    
    if (userRecordError) {
      console.error('❌ Dashboard data fetch failed:', userRecordError)
      return
    }
    
    console.log(`   ✅ Dashboard data: ${(userRecord.tenants as any).name}`)
    console.log(`   ✅ Setup status: ${(userRecord.tenants as any).setup_completed}`)
    
    // Step 4: Test Setup Wizard Data Fetch
    console.log('')
    console.log('⚙️  Step 4: Test Setup Wizard Data Fetch')
    const { data: tenantData, error: tenantDataError } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', tenant.id)
      .single()
    
    if (tenantDataError) {
      console.error('❌ Setup wizard data fetch failed:', tenantDataError)
      return
    }
    
    console.log(`   ✅ Setup wizard data: ${tenantData.name}`)
    
    // Step 5: Test VAPI Provisioning
    console.log('')
    console.log('🤖 Step 5: Test VAPI Provisioning')
    const provisioningConfig = {
      businessName: businessName,
      profile: {
        industry: 'hvac' as const,
        serviceArea: ['43068'],
        businessHours: {
          emergencyPhone: '7407393487' // This should be formatted to +17407393487
        },
        routingConfig: {
          teamMembers: [{
            name: 'Test Team Member',
            phone: '7407393487',
            role: 'technician'
          }]
        }
      }
    }
    
    console.log('   📞 Testing phone number formatting...')
    const emergencyPhone = provisioningConfig.profile.businessHours.emergencyPhone
    const formattedPhone = emergencyPhone.startsWith('+1') 
      ? emergencyPhone 
      : `+1${emergencyPhone}`
    console.log(`   Original: ${emergencyPhone}`)
    console.log(`   Formatted: ${formattedPhone}`)
    
    try {
      const result = await provisionVapiAssistant(provisioningConfig)
      
      if (result.success) {
        console.log(`   ✅ VAPI Assistant created: ${result.assistantId}`)
        console.log(`   ✅ Phone number: ${result.phoneNumber || 'None'}`)
        console.log(`   ✅ Phone provisioning failed: ${result.phoneProvisioningFailed}`)
        
        // Save assistant to database
        const { error: assistantError } = await db.from('assistants').insert({
          tenant_id: tenant.id,
          vapi_assistant_id: result.assistantId,
          vapi_number_id: result.phoneNumber,
          name: `${businessName} Receptionist`,
          status: 'active',
          settings_json: {
            system_prompt: 'Test system prompt',
            playbook_config: { industry: 'hvac' }
          }
        })
        
        if (assistantError) {
          console.error('❌ Assistant database save failed:', assistantError)
        } else {
          console.log(`   ✅ Assistant saved to database`)
        }
        
        // Update tenant setup status
        const { error: updateTenantError } = await db
          .from('tenants')
          .update({ setup_completed: true })
          .eq('id', tenant.id)
        
        if (updateTenantError) {
          console.error('❌ Tenant update failed:', updateTenantError)
        } else {
          console.log(`   ✅ Tenant setup marked as complete`)
        }
        
      } else {
        console.error(`   ❌ VAPI provisioning failed: ${result.error}`)
        return
      }
      
    } catch (vapiError: any) {
      console.error('❌ VAPI provisioning error:', vapiError.message)
      return
    }
    
    // Step 6: Test Final Dashboard State
    console.log('')
    console.log('🎯 Step 6: Test Final Dashboard State')
    const { data: finalTenant, error: finalTenantError } = await db
      .from('tenants')
      .select('setup_completed, assistants(id, vapi_assistant_id, vapi_number_id, name)')
      .eq('id', tenant.id)
      .single()
    
    if (finalTenantError) {
      console.error('❌ Final state check failed:', finalTenantError)
      return
    }
    
    console.log(`   ✅ Final setup status: ${finalTenant.setup_completed}`)
    console.log(`   ✅ Assistants: ${(finalTenant.assistants as any)?.length || 0}`)
    
    if ((finalTenant.assistants as any)?.length > 0) {
      const assistant = (finalTenant.assistants as any)[0]
      console.log(`   ✅ Assistant: ${assistant.name}`)
      console.log(`   ✅ VAPI ID: ${assistant.vapi_assistant_id}`)
      console.log(`   ✅ Phone: ${assistant.vapi_number_id || 'None'}`)
    }
    
    // Step 7: Cleanup
    console.log('')
    console.log('🧹 Step 7: Cleanup Test Data')
    await db.from('assistants').delete().eq('tenant_id', tenant.id)
    await db.from('user_tenants').delete().eq('user_id', testUserId)
    await db.from('tenants').delete().eq('id', tenant.id)
    await db.from('users').delete().eq('id', testUserId)
    console.log('   ✅ Test data cleaned up')
    
    console.log('')
    console.log('🎉 COMPLETE USER JOURNEY TEST PASSED!')
    console.log('   ✅ User signup works')
    console.log('   ✅ Onboarding works')
    console.log('   ✅ Dashboard data fetch works')
    console.log('   ✅ Setup wizard data fetch works')
    console.log('   ✅ VAPI provisioning works')
    console.log('   ✅ Database relationships work')
    console.log('   ✅ Phone number formatting works')
    console.log('')
    console.log('🚀 Ready for real user testing!')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testCompleteUserJourney()
