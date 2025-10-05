import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function fixDatabaseIssues() {
  const db = createClient()
  
  try {
    console.log('🔧 Fixing Database Issues...')
    console.log('=' .repeat(50))
    
    // 1. Delete the old assistant with phone number
    console.log('🗑️  Deleting old assistant with phone number...')
    const { error: deleteAssistantError } = await db
      .from('assistants')
      .delete()
      .eq('vapi_number_id', '+17403008197')
    
    if (deleteAssistantError) {
      console.error('❌ Error deleting assistant:', deleteAssistantError)
    } else {
      console.log('   ✅ Deleted old assistant with phone number')
    }
    
    // 2. Reset setup_completed for all tenants
    console.log('🔄 Resetting setup_completed flags...')
    const { error: resetSetupError } = await db
      .from('tenants')
      .update({ setup_completed: false })
      .neq('id', '00000000-0000-0000-0000-000000000001') // Keep demo tenant as is
    
    if (resetSetupError) {
      console.error('❌ Error resetting setup flags:', resetSetupError)
    } else {
      console.log('   ✅ Reset setup_completed flags for all tenants')
    }
    
    // 3. Clean up orphaned data
    console.log('🧹 Cleaning up orphaned data...')
    
    // Delete tenants without user relationships (except demo)
    const { error: deleteOrphanedTenantsError } = await db
      .from('tenants')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT tenant_id FROM user_tenants WHERE tenant_id IS NOT NULL)')
      .neq('id', '00000000-0000-0000-0000-000000000001')
    
    if (deleteOrphanedTenantsError) {
      console.error('❌ Error deleting orphaned tenants:', deleteOrphanedTenantsError)
    } else {
      console.log('   ✅ Deleted orphaned tenants')
    }
    
    // Delete users without tenant relationships
    const { error: deleteOrphanedUsersError } = await db
      .from('users')
      .delete()
      .not('id', 'in', '(SELECT DISTINCT user_id FROM user_tenants WHERE user_id IS NOT NULL)')
      .neq('id', '00000000-0000-0000-0000-000000000001')
    
    if (deleteOrphanedUsersError) {
      console.error('❌ Error deleting orphaned users:', deleteOrphanedUsersError)
    } else {
      console.log('   ✅ Deleted orphaned users')
    }
    
    // 4. Verify current state
    console.log('')
    console.log('📊 Current State After Cleanup:')
    
    const { data: users } = await db.from('users').select('id, email').order('created_at', { ascending: false })
    const { data: tenants } = await db.from('tenants').select('id, name, setup_completed').order('created_at', { ascending: false })
    const { data: userTenants } = await db.from('user_tenants').select('user_id, tenant_id, role')
    const { data: assistants } = await db.from('assistants').select('id, vapi_number_id, name')
    
    console.log(`   Users: ${users?.length || 0}`)
    console.log(`   Tenants: ${tenants?.length || 0}`)
    console.log(`   User-Tenant Relationships: ${userTenants?.length || 0}`)
    console.log(`   Assistants: ${assistants?.length || 0}`)
    
    if (assistants && assistants.length > 0) {
      console.log('   📞 Remaining assistants:')
      assistants.forEach(assistant => {
        console.log(`      - ${assistant.name}: ${assistant.vapi_number_id || 'No phone'}`)
      })
    }
    
    console.log('')
    console.log('✅ Database cleanup complete!')
    console.log('   Ready for fresh user flow test')
    console.log('')
    console.log('🧪 Test Flow:')
    console.log('   1. Create new user account')
    console.log('   2. Should redirect to onboarding')
    console.log('   3. Complete onboarding → dashboard')
    console.log('   4. Dashboard should show "Complete Your Setup"')
    console.log('   5. Setup wizard should work without "No tenant found" error')
    
  } catch (error: any) {
    console.error('❌ Fix error:', error.message)
  }
}

fixDatabaseIssues()
