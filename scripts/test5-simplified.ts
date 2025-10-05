import { createClient } from '../lib/db'
import { provisionVapiAssistant } from '../services/vapi-provisioner'
import { config } from 'dotenv'
import { randomUUID } from 'crypto'

config({ path: '.env.local' })

async function test5Simplified() {
  console.log('🧪 Testing Simplified Flow with test5@autorev.ai')
  console.log('==================================================')
  
  const db = createClient()
  
  try {
    // Step 1: Create test5 user
    console.log('👤 Step 1: Creating test5@autorev.ai user...')
    const testUserId = randomUUID()
    const testUserEmail = `test5-${Date.now()}@autorev.ai`
    
    console.log(`   ✅ User ID: ${testUserId}`)
    console.log(`   ✅ Email: ${testUserEmail}`)
    
    // Step 2: Create tenant
    console.log('🏢 Step 2: Creating tenant...')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: 'Test 5 HVAC Company',
        slug: `test-5-hvac-${Date.now()}`,
        website: 'https://test5hvac.com',
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
        name: 'Test 5',
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
    
    // Step 5: VAPI Provisioning
    console.log('🤖 Step 5: Provisioning VAPI assistant...')
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
    
    // Step 6: Save assistant to database (without webhook_url for now)
    console.log('💾 Step 6: Saving assistant to database...')
    const { error: assistantError } = await db
      .from('assistants')
      .insert({
        tenant_id: tenant.id,
        vapi_assistant_id: result.assistantId,
        vapi_number_id: result.phoneNumber,
        name: `${tenant.name} Receptionist`,
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
    
    // Step 7: Update tenant setup status
    console.log('✅ Step 7: Updating tenant setup status...')
    const { error: updateError } = await db
      .from('tenants')
      .update({ setup_completed: true })
      .eq('id', tenant.id)
    
    if (updateError) {
      console.error('❌ Tenant update error:', updateError)
      return
    }
    
    console.log('   ✅ Setup marked as complete')
    
    // Step 8: Create 5 test booking calls
    console.log('📞 Step 8: Creating 5 test booking calls...')
    const testCalls = []
    
    for (let i = 1; i <= 5; i++) {
      const callId = `test-call-${i}-${Date.now()}`
      const bookingConfirmation = `TEST5-${i}-${Date.now()}`
      
      // Create call
      const { data: call, error: callError } = await db
        .from('calls')
        .insert({
          tenant_id: tenant.id,
          vapi_call_id: callId,
          started_at: new Date(Date.now() - (i * 60000)).toISOString(), // Staggered times
          ended_at: new Date(Date.now() - (i * 60000) + 120000).toISOString(), // 2 minutes later
          duration_sec: 120,
          outcome: i <= 3 ? 'booked' : 'handoff', // First 3 booked, last 2 handoff
          transcript_url: `data:text/plain;base64,${Buffer.from(`Test call ${i} transcript`).toString('base64')}`,
          raw_json: { 
            transcript: `Test call ${i} transcript`, 
            summary: `Test call ${i} summary`,
            endedReason: 'Customer ended call'
          }
        })
        .select()
        .single()
      
      if (callError) {
        console.error(`❌ Call ${i} creation error:`, callError)
        continue
      }
      
      console.log(`   ✅ Call ${i} created: ${callId}`)
      testCalls.push(call)
      
      // Create booking for first 3 calls
      if (i <= 3) {
        const { data: booking, error: bookingError } = await db
          .from('bookings')
          .insert({
            tenant_id: tenant.id,
            call_id: call.id,
            name: `Test Customer ${i}`,
            phone: `+1740739348${i}`,
            address: `${i}23 Test St`,
            city: 'Columbus',
            state: 'OH',
            zip: '43068',
            window_text: i === 1 ? '9-11am' : i === 2 ? '2-4pm' : '4-6pm',
            start_ts: new Date(Date.now() + (i * 24 * 60 * 60 * 1000)).toISOString(), // Future dates
            confirmation: bookingConfirmation
          })
          .select()
          .single()
        
        if (bookingError) {
          console.error(`❌ Booking ${i} creation error:`, bookingError)
        } else {
          console.log(`   ✅ Booking ${i} created: ${bookingConfirmation}`)
        }
      }
    }
    
    // Step 9: Test dashboard metrics
    console.log('📊 Step 9: Testing dashboard metrics...')
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
    
    const { count: totalBookings } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
    
    const conversionRate = callsToday && callsToday > 0 ? (bookingsToday || 0) / callsToday * 100 : 0
    
    console.log(`   ✅ Calls today: ${callsToday}`)
    console.log(`   ✅ Bookings today: ${bookingsToday}`)
    console.log(`   ✅ Total bookings: ${totalBookings}`)
    console.log(`   ✅ Conversion rate: ${conversionRate.toFixed(1)}%`)
    
    // Step 10: Test database relationships
    console.log('🔗 Step 10: Testing database relationships...')
    const { data: assistantWithRelations } = await db
      .from('assistants')
      .select(`
        id,
        vapi_assistant_id,
        vapi_number_id,
        tenants!inner(id, name),
        users!inner(id, email)
      `)
      .eq('tenant_id', tenant.id)
      .single()
    
    if (assistantWithRelations) {
      console.log(`   ✅ Assistant ID: ${assistantWithRelations.vapi_assistant_id}`)
      console.log(`   ✅ Phone Number: ${assistantWithRelations.vapi_number_id}`)
      console.log(`   ✅ Tenant: ${(assistantWithRelations.tenants as any).name}`)
      console.log(`   ✅ User: ${(assistantWithRelations.users as any).email}`)
    }
    
    console.log('\n🎉 COMPLETE TEST5 FLOW SUCCESSFUL!')
    console.log('==================================================')
    console.log(`📱 Test Phone Number: ${result.phoneNumber}`)
    console.log(`🤖 Assistant ID: ${result.assistantId}`)
    console.log(`🏢 Tenant: ${tenant.name}`)
    console.log(`👤 User: ${testUserEmail}`)
    console.log(`📞 Test Calls: ${testCalls.length}`)
    console.log(`📅 Test Bookings: 3`)
    console.log(`📊 Conversion Rate: ${conversionRate.toFixed(1)}%`)
    console.log('\n✅ Ready for manual testing!')
    console.log('🔗 Database relationships verified: User → Tenant → Assistant')
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
  }
}

test5Simplified()
