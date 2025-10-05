import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function checkTest3Status() {
  const db = createClient()
  
  try {
    console.log('🔍 Checking test3@autorev.ai Status...')
    console.log('=' .repeat(50))
    
    // Check if test3 user exists
    const { data: testUser, error: userError } = await db
      .from('users')
      .select('id, email, name, tenant_id, created_at')
      .eq('email', 'test3@autorev.ai')
      .single()
    
    if (userError) {
      console.log('❌ test3@autorev.ai user not found')
      console.log('   You can start fresh with a new user')
      return
    }
    
    console.log(`✅ Found user: ${testUser.email}`)
    console.log(`   Name: ${testUser.name}`)
    console.log(`   Tenant ID: ${testUser.tenant_id}`)
    console.log(`   Created: ${testUser.created_at}`)
    
    // Check tenant details
    if (!testUser.tenant_id) {
      console.log('❌ User has no tenant_id')
      console.log('   User needs to complete onboarding')
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
    
    console.log(`✅ Tenant: ${tenant.name}`)
    console.log(`   Slug: ${tenant.slug}`)
    console.log(`   Setup completed: ${tenant.setup_completed}`)
    console.log(`   Created: ${tenant.created_at}`)
    
    // Check assistants
    const { data: assistants, error: assistantsError } = await db
      .from('assistants')
      .select('id, tenant_id, vapi_assistant_id, vapi_number_id, name, status, created_at')
      .eq('tenant_id', testUser.tenant_id)
      .order('created_at', { ascending: false })
    
    if (assistantsError) {
      console.error('❌ Error fetching assistants:', assistantsError)
    } else {
      console.log(`✅ Assistants found: ${assistants.length}`)
      assistants.forEach((assistant, index) => {
        console.log(`   ${index + 1}. ${assistant.name}`)
        console.log(`      VAPI Assistant ID: ${assistant.vapi_assistant_id}`)
        console.log(`      VAPI Phone Number: ${assistant.vapi_number_id || 'None'}`)
        console.log(`      Status: ${assistant.status}`)
        console.log(`      Created: ${assistant.created_at}`)
      })
    }
    
    // Check calls and bookings
    const { data: calls, error: callsError } = await db
      .from('calls')
      .select('id, started_at, outcome')
      .eq('tenant_id', testUser.tenant_id)
      .order('started_at', { ascending: false })
      .limit(5)
    
    if (callsError) {
      console.error('❌ Error fetching calls:', callsError)
    } else {
      console.log(`✅ Recent calls: ${calls.length}`)
      calls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.started_at} - ${call.outcome}`)
      })
    }
    
    const { data: bookings, error: bookingsError } = await db
      .from('bookings')
      .select('id, name, phone, confirmation, created_at')
      .eq('tenant_id', testUser.tenant_id)
      .order('created_at', { ascending: false })
      .limit(5)
    
    if (bookingsError) {
      console.error('❌ Error fetching bookings:', bookingsError)
    } else {
      console.log(`✅ Recent bookings: ${bookings.length}`)
      bookings.forEach((booking, index) => {
        console.log(`   ${index + 1}. ${booking.name} (${booking.phone}) - ${booking.confirmation}`)
      })
    }
    
    // Summary and recommendation
    console.log('')
    console.log('🎯 SUMMARY:')
    console.log(`   User exists: ✅`)
    console.log(`   Tenant exists: ${tenant ? '✅' : '❌'}`)
    console.log(`   Setup completed: ${tenant.setup_completed}`)
    console.log(`   Assistants: ${assistants.length}`)
    console.log(`   VAPI phone numbers: ${assistants.filter(a => a.vapi_number_id).length}`)
    console.log(`   Calls: ${calls.length}`)
    console.log(`   Bookings: ${bookings.length}`)
    
    console.log('')
    if (tenant.setup_completed && assistants.length > 0 && assistants.some(a => a.vapi_number_id)) {
      console.log('✅ RECOMMENDATION: Use existing test3 user')
      console.log('   - Setup is complete')
      console.log('   - Assistant and phone number exist')
      console.log('   - Ready for testing calls and bookings')
      console.log('   - Dashboard should show phone number')
    } else if (tenant.setup_completed && assistants.length > 0 && !assistants.some(a => a.vapi_number_id)) {
      console.log('⚠️  RECOMMENDATION: Fix existing test3 user')
      console.log('   - Setup marked complete but no phone number')
      console.log('   - May need to retry setup or add phone manually')
    } else {
      console.log('🆕 RECOMMENDATION: Start fresh with new user')
      console.log('   - test3 user exists but setup not complete')
      console.log('   - Clean slate for testing full flow')
      console.log('   - Better for demonstrating complete user journey')
    }
    
  } catch (error: any) {
    console.error('❌ Check failed:', error.message)
  }
}

checkTest3Status()
