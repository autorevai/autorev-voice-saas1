import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function testDashboardAuth() {
  const db = createClient()
  
  try {
    console.log('🔍 Testing Dashboard Authentication...')
    console.log('=' .repeat(50))
    
    // Test 1: Check if we can get authenticated user
    console.log('👤 Step 1: Check Authentication')
    const { data: { user }, error: authError } = await db.auth.getUser()
    
    if (authError) {
      console.error('❌ Auth error:', authError)
      return
    }
    
    if (!user) {
      console.log('❌ No authenticated user found')
      console.log('   This is why dashboard fails - no user session')
      return
    }
    
    console.log(`   ✅ Authenticated user: ${user.email} (${user.id})`)
    
    // Test 2: Check user record in database
    console.log('')
    console.log('📊 Step 2: Check User Record')
    const { data: userRecord, error: userError } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('❌ User record error:', userError)
      console.log('   This is why dashboard fails - user not in database')
      return
    }
    
    if (!userRecord?.tenant_id) {
      console.error('❌ User has no tenant_id')
      console.log('   This is why dashboard fails - user not linked to tenant')
      return
    }
    
    console.log(`   ✅ User record found`)
    console.log(`   ✅ Tenant ID: ${userRecord.tenant_id}`)
    
    // Test 3: Check tenant
    console.log('')
    console.log('🏢 Step 3: Check Tenant')
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', userRecord.tenant_id)
      .single()
    
    if (tenantError) {
      console.error('❌ Tenant error:', tenantError)
      return
    }
    
    console.log(`   ✅ Tenant: ${tenant.name}`)
    console.log(`   ✅ Setup completed: ${tenant.setup_completed}`)
    
    // Test 4: Check assistant (may not exist)
    console.log('')
    console.log('🤖 Step 4: Check Assistant')
    const { data: assistant, error: assistantError } = await db
      .from('assistants')
      .select('id, vapi_assistant_id, vapi_number_id, name')
      .eq('tenant_id', userRecord.tenant_id)
      .eq('status', 'active')
      .maybeSingle()
    
    if (assistantError) {
      console.error('❌ Assistant error:', assistantError)
    } else if (assistant) {
      console.log(`   ✅ Assistant: ${assistant.name}`)
      console.log(`   ✅ VAPI ID: ${assistant.vapi_assistant_id}`)
      console.log(`   ✅ Phone: ${assistant.vapi_number_id || 'None'}`)
    } else {
      console.log(`   ℹ️  No assistant found (setup not completed)`)
    }
    
    // Test 5: Simulate dashboard data fetch
    console.log('')
    console.log('📱 Step 5: Simulate Dashboard Data Fetch')
    try {
      // This is the exact logic from getDashboardData()
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
      
      console.log(`   ✅ Dashboard data fetch successful`)
      
    } catch (dashboardError: any) {
      console.error('❌ Dashboard simulation failed:', dashboardError.message)
      console.log('   This is the error causing "Error loading dashboard data"')
    }
    
    console.log('')
    console.log('🎯 Summary:')
    console.log(`   Authentication: ${user ? '✅' : '❌'}`)
    console.log(`   User record: ${userRecord ? '✅' : '❌'}`)
    console.log(`   Tenant: ${tenant ? '✅' : '❌'}`)
    console.log(`   Assistant: ${assistant ? '✅' : '❌'}`)
    console.log(`   Setup completed: ${tenant?.setup_completed}`)
    
    if (!user || !userRecord || !tenant) {
      console.log('')
      console.log('❌ CRITICAL ISSUES FOUND:')
      console.log('   Dashboard will show "Error loading dashboard data"')
      console.log('   User needs to complete onboarding or setup')
    } else if (!assistant && !tenant.setup_completed) {
      console.log('')
      console.log('ℹ️  NORMAL STATE:')
      console.log('   User needs to complete setup wizard')
      console.log('   Dashboard should show "Complete Your Setup"')
    } else if (assistant && tenant.setup_completed) {
      console.log('')
      console.log('✅ COMPLETE SETUP:')
      console.log('   Dashboard should show phone number')
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message)
  }
}

testDashboardAuth()
