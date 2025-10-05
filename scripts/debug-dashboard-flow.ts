import { config } from 'dotenv'
import { createClient } from '../lib/supabase/server'

// Load environment variables
config({ path: '.env.local' })

async function debugDashboardFlow() {
  const db = createClient()
  
  try {
    console.log('🔍 Debugging Dashboard Flow Like a Full-Stack Engineer...')
    console.log('=' .repeat(70))
    
    // Step 1: Test server-side authentication
    console.log('👤 Step 1: Test Server-Side Authentication')
    const { data: { user }, error: authError } = await db.auth.getUser()
    
    if (authError) {
      console.error('❌ Server auth error:', authError)
      console.log('   This is why dashboard fails - server can\'t authenticate user')
      return
    }
    
    if (!user) {
      console.log('❌ No authenticated user in server context')
      console.log('   Dashboard needs user to be logged in')
      return
    }
    
    console.log(`   ✅ Server authenticated user: ${user.email} (${user.id})`)
    
    // Step 2: Test user record fetch
    console.log('')
    console.log('📊 Step 2: Test User Record Fetch')
    const { data: userRecord, error: userError } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('❌ User record error:', userError)
      console.log('   Dashboard fails because user not in database')
      return
    }
    
    if (!userRecord?.tenant_id) {
      console.error('❌ User has no tenant_id')
      console.log('   Dashboard fails because user not linked to tenant')
      return
    }
    
    console.log(`   ✅ User record found with tenant: ${userRecord.tenant_id}`)
    
    // Step 3: Test tenant fetch
    console.log('')
    console.log('🏢 Step 3: Test Tenant Fetch')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('setup_completed')
      .eq('id', userRecord.tenant_id)
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant error:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant found, setup completed: ${tenant.setup_completed}`)
    
    // Step 4: Test assistant fetch (may not exist)
    console.log('')
    console.log('🤖 Step 4: Test Assistant Fetch')
    const { data: assistant, error: assistantError } = await db
      .from('assistants')
      .select('*, vapi_number_id')
      .eq('tenant_id', userRecord.tenant_id)
      .eq('status', 'active')
      .maybeSingle()
    
    if (assistantError) {
      console.error('❌ Assistant error:', assistantError)
    } else if (assistant) {
      console.log(`   ✅ Assistant found: ${assistant.name}`)
      console.log(`   ✅ VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log(`   ✅ VAPI Phone Number: ${assistant.vapi_number_id || 'NULL'}`)
    } else {
      console.log(`   ℹ️  No assistant found (setup not completed)`)
    }
    
    // Step 5: Test dashboard data aggregation
    console.log('')
    console.log('📱 Step 5: Test Dashboard Data Aggregation')
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayISO = today.toISOString()
      
      // Get calls today
      const { count: callsToday } = await db
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', userRecord.tenant_id)
        .gte('started_at', todayISO)
      
      console.log(`   ✅ Calls today: ${callsToday || 0}`)
      
      // Get bookings today
      const { count: bookingsToday } = await db
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', userRecord.tenant_id)
        .gte('created_at', todayISO)
      
      console.log(`   ✅ Bookings today: ${bookingsToday || 0}`)
      
      // Get total bookings
      const { count: totalBookings } = await db
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', userRecord.tenant_id)
      
      console.log(`   ✅ Total bookings: ${totalBookings || 0}`)
      
      // Get recent calls for table
      const { data: recentCalls } = await db
        .from('calls')
        .select(`
          id,
          vapi_call_id,
          started_at,
          ended_at,
          duration_sec,
          outcome,
          bookings(name, phone)
        `)
        .eq('tenant_id', userRecord.tenant_id)
        .order('started_at', { ascending: false })
        .limit(20)
      
      console.log(`   ✅ Recent calls: ${recentCalls?.length || 0}`)
      
      console.log(`   ✅ Dashboard data aggregation successful`)
      
    } catch (aggregationError: any) {
      console.error('❌ Dashboard aggregation failed:', aggregationError.message)
      console.log('   This is why dashboard shows error')
    }
    
    // Step 6: Check VAPI phone number storage
    console.log('')
    console.log('📞 Step 6: Check VAPI Phone Number Storage')
    if (assistant) {
      console.log(`   VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
      console.log(`   VAPI Phone Number: ${assistant.vapi_number_id || 'NULL'}`)
      
      if (!assistant.vapi_number_id) {
        console.log('   ⚠️  ISSUE: VAPI phone number is NULL!')
        console.log('   This means phone provisioning failed')
        console.log('   Dashboard will show "Complete Your Setup"')
      } else {
        console.log('   ✅ VAPI phone number is stored correctly')
        console.log('   Dashboard should show phone number')
      }
    } else {
      console.log('   ℹ️  No assistant found - user needs to complete setup')
    }
    
    // Step 7: Full diagnosis
    console.log('')
    console.log('🎯 Full-Stack Engineer Diagnosis:')
    console.log('=' .repeat(50))
    console.log(`   Authentication: ${user ? '✅' : '❌'}`)
    console.log(`   User Database: ${userRecord ? '✅' : '❌'}`)
    console.log(`   Tenant Link: ${userRecord?.tenant_id ? '✅' : '❌'}`)
    console.log(`   Tenant Data: ${tenant ? '✅' : '❌'}`)
    console.log(`   Assistant: ${assistant ? '✅' : '❌'}`)
    console.log(`   VAPI Phone: ${assistant?.vapi_number_id ? '✅' : '❌'}`)
    console.log(`   Setup Complete: ${tenant?.setup_completed}`)
    
    if (!user || !userRecord || !tenant) {
      console.log('')
      console.log('❌ CRITICAL FAILURE:')
      console.log('   Dashboard will show "Error loading dashboard data"')
      console.log('   User authentication or database connection failed')
    } else if (!assistant && !tenant.setup_completed) {
      console.log('')
      console.log('ℹ️  NORMAL STATE - SHOW SETUP BANNER:')
      console.log('   Dashboard should show "Complete Your Setup" banner')
      console.log('   User needs to go through setup wizard')
    } else if (assistant && assistant.vapi_number_id && tenant.setup_completed) {
      console.log('')
      console.log('✅ COMPLETE SETUP - SHOW PHONE NUMBER:')
      console.log(`   Dashboard should show phone: ${assistant.vapi_number_id}`)
      console.log(`   Assistant: ${assistant.name}`)
    } else if (assistant && !assistant.vapi_number_id) {
      console.log('')
      console.log('⚠️  PARTIAL SETUP - PHONE PROVISIONING FAILED:')
      console.log('   Assistant created but phone number failed')
      console.log('   Dashboard should show setup retry or manual phone entry')
    }
    
  } catch (error: any) {
    console.error('❌ Debug failed:', error.message)
    console.error('   Full error:', error)
  }
}

debugDashboardFlow()
