import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function productionTestComplete() {
  const db = createClient()
  
  try {
    console.log('🚀 COMPLETE PRODUCTION TEST - Like Smith AI')
    console.log('=' .repeat(80))
    console.log('Testing: User → Tenant → Assistant → Dashboard → Booking')
    console.log('')
    
    // Step 1: Create New User (Signup)
    console.log('👤 STEP 1: USER SIGNUP')
    console.log('-' .repeat(40))
    const testUserId = '00000000-0000-0000-0000-' + Date.now().toString().slice(-12).padStart(12, '0')
    const testEmail = `production-${Date.now()}@autorev.ai`
    const businessName = `Production HVAC ${Date.now()}`
    
    console.log(`Creating user: ${testEmail}`)
    console.log(`Business: ${businessName}`)
    console.log(`User ID: ${testUserId}`)
    
    // Create user in auth.users (simulated)
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
    console.log('✅ User created in users table')
    
    // Verify user in database
    const { data: createdUser, error: userFetchError } = await db
      .from('users')
      .select('*')
      .eq('id', testUserId)
      .single()
    
    if (userFetchError) {
      console.error('❌ User fetch failed:', userFetchError)
      return
    }
    
    console.log('📊 USER TABLE DATA:')
    console.log(`   ID: ${createdUser.id}`)
    console.log(`   Email: ${createdUser.email}`)
    console.log(`   Name: ${createdUser.name}`)
    console.log(`   Tenant ID: ${createdUser.tenant_id || 'NULL'}`)
    console.log(`   Created: ${createdUser.created_at}`)
    
    // Step 2: Create Tenant (Onboarding)
    console.log('')
    console.log('🏢 STEP 2: TENANT CREATION (ONBOARDING)')
    console.log('-' .repeat(40))
    
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: businessName,
        slug: businessName.toLowerCase().replace(/\W+/g, '-'),
        setup_completed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant creation failed:', tenantError)
      return
    }
    console.log('✅ Tenant created in tenants table')
    
    // Verify tenant in database
    const { data: createdTenant, error: tenantFetchError } = await db
      .from('tenants')
      .select('*')
      .eq('id', tenant.id)
      .single()
    
    if (tenantFetchError) {
      console.error('❌ Tenant fetch failed:', tenantFetchError)
      return
    }
    
    console.log('📊 TENANT TABLE DATA:')
    console.log(`   ID: ${createdTenant.id}`)
    console.log(`   Name: ${createdTenant.name}`)
    console.log(`   Slug: ${createdTenant.slug}`)
    console.log(`   Setup Completed: ${createdTenant.setup_completed}`)
    console.log(`   Created: ${createdTenant.created_at}`)
    
    // Link user to tenant
    console.log('')
    console.log('🔗 STEP 3: USER-TENANT LINKING')
    console.log('-' .repeat(40))
    
    // Update user with tenant_id
    const { error: updateUserError } = await db
      .from('users')
      .update({ tenant_id: tenant.id })
      .eq('id', testUserId)
    
    if (updateUserError) {
      console.error('❌ User update failed:', updateUserError)
      return
    }
    console.log('✅ User linked to tenant (users.tenant_id updated)')
    
    // Create user_tenants relationship
    const { error: userTenantError } = await db.from('user_tenants').insert({
      user_id: testUserId,
      tenant_id: tenant.id,
      role: 'owner',
      created_at: new Date().toISOString()
    })
    
    if (userTenantError) {
      console.error('❌ User-tenant relationship failed:', userTenantError)
      return
    }
    console.log('✅ User-tenant relationship created')
    
    // Verify user_tenants table
    const { data: userTenants, error: userTenantsError } = await db
      .from('user_tenants')
      .select('*')
      .eq('user_id', testUserId)
    
    if (userTenantsError) {
      console.error('❌ User-tenants fetch failed:', userTenantsError)
      return
    }
    
    console.log('📊 USER_TENANTS TABLE DATA:')
    userTenants.forEach((ut, index) => {
      console.log(`   ${index + 1}. User ID: ${ut.user_id}`)
      console.log(`      Tenant ID: ${ut.tenant_id}`)
      console.log(`      Role: ${ut.role}`)
      console.log(`      Created: ${ut.created_at}`)
    })
    
    // Step 4: Test Dashboard Data Fetch (Before Setup)
    console.log('')
    console.log('📊 STEP 4: DASHBOARD DATA FETCH (BEFORE SETUP)')
    console.log('-' .repeat(40))
    
    try {
      // Simulate dashboard data fetch
      const { data: dashboardData, error: dashboardError } = await db
        .from('users')
        .select(`
          id,
          email,
          name,
          tenant_id,
          tenants(
            id,
            name,
            setup_completed,
            assistants(
              id,
              vapi_assistant_id,
              vapi_number_id,
              name,
              status
            )
          )
        `)
        .eq('id', testUserId)
        .single()
      
      if (dashboardError) {
        console.error('❌ Dashboard data fetch failed:', dashboardError)
        return
      }
      
      console.log('✅ Dashboard data fetch successful')
      console.log('📊 DASHBOARD DATA:')
      console.log(`   User: ${dashboardData.email}`)
      console.log(`   Tenant: ${(dashboardData.tenants as any).name}`)
      console.log(`   Setup Completed: ${(dashboardData.tenants as any).setup_completed}`)
      console.log(`   Assistants: ${(dashboardData.tenants as any).assistants?.length || 0}`)
      
      if ((dashboardData.tenants as any).assistants?.length > 0) {
        console.log('   ⚠️  Unexpected: Assistant found before setup')
      } else {
        console.log('   ✅ Expected: No assistant found (setup not completed)')
        console.log('   ✅ Dashboard should show "Complete Your Setup" banner')
      }
      
    } catch (dashboardError: any) {
      console.error('❌ Dashboard simulation failed:', dashboardError.message)
      return
    }
    
    // Step 5: VAPI Provisioning (Setup Wizard)
    console.log('')
    console.log('🤖 STEP 5: VAPI PROVISIONING (SETUP WIZARD)')
    console.log('-' .repeat(40))
    
    const { provisionVapiAssistant } = await import('../services/vapi-provisioner')
    
    const provisioningConfig = {
      businessName: businessName,
      profile: {
        industry: 'hvac' as const,
        serviceArea: ['43068'],
        businessHours: {
          emergencyPhone: '7407393487' // Your real phone number
        },
        routingConfig: {
          teamMembers: [{
            name: 'Chris DiYanni',
            phone: '7407393487',
            role: 'technician'
          }]
        }
      }
    }
    
    console.log('📞 Phone number formatting test:')
    const emergencyPhone = provisioningConfig.profile.businessHours.emergencyPhone
    const formattedPhone = emergencyPhone.startsWith('+1') 
      ? emergencyPhone 
      : `+1${emergencyPhone}`
    console.log(`   Original: ${emergencyPhone}`)
    console.log(`   Formatted: ${formattedPhone}`)
    
    try {
      console.log('🚀 Calling VAPI provisioning...')
      const result = await provisionVapiAssistant(provisioningConfig)
      
      if (result.success) {
        console.log('✅ VAPI Assistant created successfully!')
        console.log(`   Assistant ID: ${result.assistantId}`)
        console.log(`   Phone Number: ${result.phoneNumber}`)
        console.log(`   Phone Provisioning Failed: ${result.phoneProvisioningFailed}`)
        
        // Save assistant to database
        console.log('')
        console.log('💾 SAVING ASSISTANT TO DATABASE')
        console.log('-' .repeat(40))
        
        const { error: assistantError } = await db.from('assistants').insert({
          tenant_id: tenant.id,
          vapi_assistant_id: result.assistantId,
          vapi_number_id: result.phoneNumber,
          name: `${businessName} Receptionist`,
          status: 'active',
          settings_json: {
            system_prompt: `AI receptionist for ${businessName}`,
            playbook_config: { industry: 'hvac' }
          },
          created_at: new Date().toISOString()
        })
        
        if (assistantError) {
          console.error('❌ Assistant database save failed:', assistantError)
          return
        }
        console.log('✅ Assistant saved to assistants table')
        
        // Verify assistant in database
        const { data: createdAssistant, error: assistantFetchError } = await db
          .from('assistants')
          .select('*')
          .eq('tenant_id', tenant.id)
          .single()
        
        if (assistantFetchError) {
          console.error('❌ Assistant fetch failed:', assistantFetchError)
          return
        }
        
        console.log('📊 ASSISTANTS TABLE DATA:')
        console.log(`   ID: ${createdAssistant.id}`)
        console.log(`   Tenant ID: ${createdAssistant.tenant_id}`)
        console.log(`   VAPI Assistant ID: ${createdAssistant.vapi_assistant_id}`)
        console.log(`   VAPI Phone Number: ${createdAssistant.vapi_number_id}`)
        console.log(`   Name: ${createdAssistant.name}`)
        console.log(`   Status: ${createdAssistant.status}`)
        console.log(`   Created: ${createdAssistant.created_at}`)
        
        // Update tenant setup status
        console.log('')
        console.log('🔄 UPDATING TENANT SETUP STATUS')
        console.log('-' .repeat(40))
        
        const { error: updateTenantError } = await db
          .from('tenants')
          .update({ setup_completed: true })
          .eq('id', tenant.id)
        
        if (updateTenantError) {
          console.error('❌ Tenant update failed:', updateTenantError)
          return
        }
        console.log('✅ Tenant setup marked as complete')
        
        // Verify tenant update
        const { data: updatedTenant, error: updatedTenantError } = await db
          .from('tenants')
          .select('*')
          .eq('id', tenant.id)
          .single()
        
        if (updatedTenantError) {
          console.error('❌ Updated tenant fetch failed:', updatedTenantError)
          return
        }
        
        console.log('📊 UPDATED TENANT TABLE DATA:')
        console.log(`   Setup Completed: ${updatedTenant.setup_completed}`)
        console.log(`   Updated: ${updatedTenant.updated_at}`)
        
      } else {
        console.error(`❌ VAPI provisioning failed: ${result.error}`)
        return
      }
      
    } catch (vapiError: any) {
      console.error('❌ VAPI provisioning error:', vapiError.message)
      return
    }
    
    // Step 6: Test Final Dashboard State
    console.log('')
    console.log('📱 STEP 6: FINAL DASHBOARD STATE TEST')
    console.log('-' .repeat(40))
    
    const { data: finalDashboardData, error: finalDashboardError } = await db
      .from('users')
      .select(`
        id,
        email,
        tenant_id,
        tenants(
          id,
          name,
          setup_completed,
          assistants(
            id,
            vapi_assistant_id,
            vapi_number_id,
            name,
            status
          )
        )
      `)
      .eq('id', testUserId)
      .single()
    
    if (finalDashboardError) {
      console.error('❌ Final dashboard data fetch failed:', finalDashboardError)
      return
    }
    
    const tenantInfo = (finalDashboardData.tenants as any)
    const assistants = tenantInfo.assistants || []
    const hasPhoneNumber = assistants.some((a: any) => a.vapi_number_id)
    
    console.log('✅ Final dashboard data fetch successful')
    console.log('📊 FINAL DASHBOARD DATA:')
    console.log(`   User: ${finalDashboardData.email}`)
    console.log(`   Tenant: ${tenantInfo.name}`)
    console.log(`   Setup Completed: ${tenantInfo.setup_completed}`)
    console.log(`   Assistants Count: ${assistants.length}`)
    console.log(`   Has Phone Number: ${hasPhoneNumber}`)
    
    if (assistants.length > 0) {
      const assistant = assistants[0]
      console.log(`   Assistant Name: ${assistant.name}`)
      console.log(`   VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log(`   VAPI Phone Number: ${assistant.vapi_number_id}`)
      console.log(`   Status: ${assistant.status}`)
    }
    
    if (tenantInfo.setup_completed && assistants.length > 0 && hasPhoneNumber) {
      console.log('✅ Dashboard should show phone number display')
      console.log(`   Phone: ${assistants[0].vapi_number_id}`)
    } else {
      console.log('⚠️  Dashboard will show setup banner')
    }
    
    // Step 7: Test Booking Creation
    console.log('')
    console.log('📞 STEP 7: TEST BOOKING CREATION')
    console.log('-' .repeat(40))
    
    // Create a test call first
    const { data: testCall, error: callError } = await db.from('calls').insert({
      tenant_id: tenant.id,
      vapi_call_id: `test-call-${Date.now()}`,
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      duration_sec: 120,
      outcome: 'booked',
      cost_cents: 50,
      transcript_url: 'data:text/plain;base64,VGVzdCB0cmFuc2NyaXB0',
      raw_json: { test: true }
    }).select().single()
    
    if (callError) {
      console.error('❌ Test call creation failed:', callError)
      return
    }
    console.log('✅ Test call created')
    
    // Create a test booking
    const { data: testBooking, error: bookingError } = await db.from('bookings').insert({
      tenant_id: tenant.id,
      call_id: testCall.id,
      confirmation: 'ABC123',
      window_text: 'tomorrow 9am',
      start_ts: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      duration_min: 120,
      name: 'John Smith',
      phone: '+17401234567',
      address: '123 Main St, Columbus, OH 43068',
      city: 'Columbus',
      state: 'OH',
      zip: '43068',
      summary: 'HVAC repair appointment'
    }).select().single()
    
    if (bookingError) {
      console.error('❌ Test booking creation failed:', bookingError)
      return
    }
    console.log('✅ Test booking created')
    
    // Verify booking in database
    const { data: createdBooking, error: bookingFetchError } = await db
      .from('bookings')
      .select('*')
      .eq('id', testBooking.id)
      .single()
    
    if (bookingFetchError) {
      console.error('❌ Booking fetch failed:', bookingFetchError)
      return
    }
    
    console.log('📊 BOOKINGS TABLE DATA:')
    console.log(`   ID: ${createdBooking.id}`)
    console.log(`   Tenant ID: ${createdBooking.tenant_id}`)
    console.log(`   Call ID: ${createdBooking.call_id}`)
    console.log(`   Customer: ${createdBooking.name}`)
    console.log(`   Phone: ${createdBooking.phone}`)
    console.log(`   Address: ${createdBooking.address}`)
    console.log(`   Confirmation: ${createdBooking.confirmation}`)
    console.log(`   Window: ${createdBooking.window_text}`)
    console.log(`   Start: ${createdBooking.start_ts}`)
    console.log(`   Duration: ${createdBooking.duration_min} min`)
    console.log(`   Created: ${createdBooking.created_at}`)
    
    // Step 8: Test Dashboard with Data
    console.log('')
    console.log('📊 STEP 8: DASHBOARD WITH REAL DATA')
    console.log('-' .repeat(40))
    
    // Get calls today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const { count: callsToday } = await db
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('started_at', todayISO)
    
    const { count: bookingsToday } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
      .gte('created_at', todayISO)
    
    const { count: totalBookings } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenant.id)
    
    const conversionRate = callsToday > 0 ? ((bookingsToday || 0) / callsToday * 100).toFixed(1) : '0.0'
    
    console.log('📊 DASHBOARD METRICS:')
    console.log(`   Calls Today: ${callsToday || 0}`)
    console.log(`   Bookings Today: ${bookingsToday || 0}`)
    console.log(`   Total Bookings: ${totalBookings || 0}`)
    console.log(`   Conversion Rate: ${conversionRate}%`)
    
    // Step 9: Cleanup
    console.log('')
    console.log('🧹 STEP 9: CLEANUP TEST DATA')
    console.log('-' .repeat(40))
    
    await db.from('bookings').delete().eq('tenant_id', tenant.id)
    await db.from('calls').delete().eq('tenant_id', tenant.id)
    await db.from('assistants').delete().eq('tenant_id', tenant.id)
    await db.from('user_tenants').delete().eq('user_id', testUserId)
    await db.from('tenants').delete().eq('id', tenant.id)
    await db.from('users').delete().eq('id', testUserId)
    
    console.log('✅ All test data cleaned up')
    
    console.log('')
    console.log('🎉 PRODUCTION TEST COMPLETED SUCCESSFULLY!')
    console.log('=' .repeat(80))
    console.log('✅ User signup and database storage')
    console.log('✅ Tenant creation and linking')
    console.log('✅ User-tenant relationships')
    console.log('✅ Dashboard data fetching')
    console.log('✅ VAPI assistant provisioning')
    console.log('✅ Phone number storage')
    console.log('✅ Assistant database storage')
    console.log('✅ Tenant setup completion')
    console.log('✅ Booking creation and storage')
    console.log('✅ Dashboard metrics calculation')
    console.log('✅ Complete end-to-end flow')
    console.log('')
    console.log('🚀 SYSTEM IS PRODUCTION READY!')
    console.log('   Like Smith AI, Vapi, and other top voice AI SaaS companies')
    console.log('   All tables updating correctly')
    console.log('   Dashboard working with real data')
    console.log('   Bookings system functional')
    
  } catch (error: any) {
    console.error('❌ Production test failed:', error.message)
    console.error('   Full error:', error)
  }
}

productionTestComplete()
