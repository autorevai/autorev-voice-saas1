import { createClient } from '../lib/db'
import { provisionVapiAssistant } from '../services/vapi-provisioner'
import { config } from 'dotenv'
import { randomUUID } from 'crypto'

config({ path: '.env.local' })

async function test4CompleteFlow() {
  console.log('🧪 Testing Complete Flow with test4@autorev.ai')
  console.log('==================================================')
  
  const db = createClient()
  
  try {
    // Step 1: Create test4 user
    console.log('👤 Step 1: Creating test4@autorev.ai user...')
    const testUserId = randomUUID() // Proper UUID format
    const testUserEmail = `test4-${Date.now()}@autorev.ai`
    
    // Create user in auth.users (simulate)
    console.log(`   ✅ User ID: ${testUserId}`)
    console.log(`   ✅ Email: ${testUserEmail}`)
    
    // Step 2: Create tenant
    console.log('🏢 Step 2: Creating tenant...')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: 'Test 4 HVAC Company',
        slug: `test-4-hvac-${Date.now()}`,
        website: 'https://test4hvac.com',
        setup_completed: false
      })
      .select()
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant creation error:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant created: ${tenant.name} (${tenant.id})`)
    
    // Step 3: Create user record
    console.log('👤 Step 3: Creating user record...')
    const { error: userError } = await db
      .from('users')
      .insert({
        id: testUserId,
        email: testUserEmail,
        name: 'Test 4',
        tenant_id: tenant.id
      })
    
    if (userError) {
      console.error('❌ User creation error:', userError)
      return
    }
    
    console.log('   ✅ User record created')
    
    // Step 4: Create user-tenant relationship
    console.log('🔗 Step 4: Creating user-tenant relationship...')
    const { error: userTenantError } = await db
      .from('user_tenants')
      .insert({
        user_id: testUserId,
        tenant_id: tenant.id,
        role: 'owner'
      })
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship error:', userTenantError)
      return
    }
    
    console.log('   ✅ User-tenant relationship created')
    
    // Step 5: Test dashboard data fetch
    console.log('📊 Step 5: Testing dashboard data fetch...')
    const { data: dashboardData } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', tenant.id)
      .single()
    
    console.log(`   ✅ Dashboard data: ${dashboardData?.name}, setup: ${dashboardData?.setup_completed}`)
    
    // Step 6: VAPI Provisioning
    console.log('🤖 Step 6: Provisioning VAPI assistant...')
    const result = await provisionVapiAssistant({
      businessName: tenant.name,
      profile: {
        industry: 'hvac',
        serviceArea: ['43068'],
        businessHours: {
          emergencyPhone: '7407393487'
        },
        routingConfig: {
          teamMembers: [{
            name: 'Team Member',
            phone: '7407393487',
            role: 'technician'
          }]
        }
      }
    })
    
    if (result.success) {
      console.log(`   ✅ Assistant created: ${result.assistantId}`)
      console.log(`   ✅ Phone number: ${result.phoneNumber}`)
    } else {
      console.error('❌ VAPI provisioning failed:', result.error)
      return
    }
    
    // Step 7: Save assistant to database
    console.log('💾 Step 7: Saving assistant to database...')
    const { error: assistantError } = await db
      .from('assistants')
      .insert({
        tenant_id: tenant.id,
        name: `${tenant.name} Receptionist`,
        vapi_assistant_id: result.assistantId,
        vapi_number_id: result.phoneNumber,
        status: 'active',
        settings_json: {
          system_prompt: 'HVAC AI Receptionist',
          playbook_config: 'hvac'
        }
      })
    
    if (assistantError) {
      console.error('❌ Assistant save error:', assistantError)
      return
    }
    
    console.log('   ✅ Assistant saved to database')
    
    // Step 8: Update tenant setup status
    console.log('✅ Step 8: Updating tenant setup status...')
    const { error: updateError } = await db
      .from('tenants')
      .update({ setup_completed: true })
      .eq('id', tenant.id)
    
    if (updateError) {
      console.error('❌ Tenant update error:', updateError)
      return
    }
    
    console.log('   ✅ Setup marked as complete')
    
    // Step 9: Test final dashboard state
    console.log('📊 Step 9: Testing final dashboard state...')
    const { data: finalTenant } = await db
      .from('tenants')
      .select('setup_completed')
      .eq('id', tenant.id)
      .single()
    
    const { data: finalAssistant } = await db
      .from('assistants')
      .select('vapi_assistant_id, vapi_number_id')
      .eq('tenant_id', tenant.id)
      .single()
    
    console.log(`   ✅ Setup completed: ${finalTenant?.setup_completed}`)
    console.log(`   ✅ Assistant ID: ${finalAssistant?.vapi_assistant_id}`)
    console.log(`   ✅ Phone Number: ${finalAssistant?.vapi_number_id}`)
    
    // Step 10: Test booking creation
    console.log('📅 Step 10: Testing booking creation...')
    const { data: booking, error: bookingError } = await db
      .from('bookings')
      .insert({
        tenant_id: tenant.id,
        name: 'Test Customer',
        phone: '+17407393487',
        address: '123 Test St',
        city: 'Columbus',
        state: 'OH',
        zip: '43068',
        window_text: '9-11am',
        start_ts: '2025-10-06T09:00:00Z',
        confirmation: `TEST4-${Date.now()}`
      })
      .select()
      .single()
    
    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError)
      return
    }
    
    console.log(`   ✅ Booking created: ${booking.confirmation}`)
    
    // Step 11: Test call creation
    console.log('📞 Step 11: Testing call creation...')
    const { data: call, error: callError } = await db
      .from('calls')
      .insert({
        tenant_id: tenant.id,
        vapi_call_id: 'test-call-001',
        started_at: new Date().toISOString(),
        ended_at: new Date(Date.now() + 120000).toISOString(), // 2 minutes later
        duration_sec: 120,
        outcome: 'booked',
        transcript_url: 'data:text/plain;base64,VGVzdCB0cmFuc2NyaXB0',
        raw_json: { transcript: 'Test transcript', summary: 'Test call' }
      })
      .select()
      .single()
    
    if (callError) {
      console.error('❌ Call creation error:', callError)
      return
    }
    
    console.log(`   ✅ Call created: ${call.vapi_call_id}`)
    
    // Step 12: Final dashboard metrics
    console.log('📊 Step 12: Final dashboard metrics...')
    const { count: callsToday } = await db
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('started_at', new Date().toISOString().split('T')[0])
    
    const { count: bookingsToday } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', new Date().toISOString().split('T')[0])
    
    console.log(`   ✅ Calls today: ${callsToday}`)
    console.log(`   ✅ Bookings today: ${bookingsToday}`)
    
    console.log('\n🎉 COMPLETE FLOW TEST SUCCESSFUL!')
    console.log('==================================================')
    console.log(`📱 Test Phone Number: ${result.phoneNumber}`)
    console.log(`🤖 Assistant ID: ${result.assistantId}`)
    console.log(`🏢 Tenant: ${tenant.name}`)
    console.log(`👤 User: ${testUserEmail}`)
    console.log('\n✅ Ready for manual testing!')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

test4CompleteFlow()
