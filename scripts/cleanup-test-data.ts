import { createClient } from '../lib/db'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...')
  
  const db = createClient()
  
  try {
    // Delete test assistants
    console.log('🗑️ Deleting test assistants...')
    const { error: assistantError } = await db
      .from('assistants')
      .delete()
      .like('name', '%Test%')
    
    if (assistantError) {
      console.error('❌ Error deleting assistants:', assistantError)
    } else {
      console.log('✅ Test assistants deleted')
    }
    
    // Delete test tenants
    console.log('🗑️ Deleting test tenants...')
    const { error: tenantError } = await db
      .from('tenants')
      .delete()
      .like('name', '%Test%')
    
    if (tenantError) {
      console.error('❌ Error deleting tenants:', tenantError)
    } else {
      console.log('✅ Test tenants deleted')
    }
    
    // Delete test users
    console.log('🗑️ Deleting test users...')
    const { error: userError } = await db
      .from('users')
      .delete()
      .like('email', '%test%')
    
    if (userError) {
      console.error('❌ Error deleting users:', userError)
    } else {
      console.log('✅ Test users deleted')
    }
    
    // Delete test calls
    console.log('🗑️ Deleting test calls...')
    const { error: callError } = await db
      .from('calls')
      .delete()
      .like('vapi_call_id', 'test-call%')
    
    if (callError) {
      console.error('❌ Error deleting calls:', callError)
    } else {
      console.log('✅ Test calls deleted')
    }
    
    // Delete test bookings
    console.log('🗑️ Deleting test bookings...')
    const { error: bookingError } = await db
      .from('bookings')
      .delete()
      .like('confirmation', 'TEST%')
    
    if (bookingError) {
      console.error('❌ Error deleting bookings:', bookingError)
    } else {
      console.log('✅ Test bookings deleted')
    }
    
    console.log('🎉 Test data cleanup complete!')
    
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message)
  }
}

cleanupTestData()