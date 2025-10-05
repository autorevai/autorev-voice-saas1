import { config } from 'dotenv'
import { createClient } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })

async function fixTenantContext() {
  const db = createClient()
  
  try {
    console.log('🔧 Fixing Tenant Context Issue...')
    console.log('=' .repeat(50))
    
    // 1. Get the test2@autorev.ai user
    const { data: testUser, error: userError } = await db
      .from('users')
      .select('id, email')
      .eq('email', 'test2@autorev.ai')
      .single()
    
    if (userError) {
      console.error('❌ User not found:', userError)
      return
    }
    
    console.log(`👤 Found user: ${testUser.email} (${testUser.id})`)
    
    // 2. Check if user has tenant_id in users table
    const { data: userRecord, error: userRecordError } = await db
      .from('users')
      .select('*')
      .eq('id', testUser.id)
      .single()
    
    if (userRecordError) {
      console.error('❌ Error fetching user record:', userRecordError)
      return
    }
    
    console.log('📊 User record fields:')
    Object.keys(userRecord).forEach(key => {
      console.log(`   ${key}: ${userRecord[key]}`)
    })
    
    // 3. Check if tenant_id is null
    if (!userRecord.tenant_id) {
      console.log('')
      console.log('❌ ISSUE FOUND: tenant_id is null in users table')
      console.log('   This is why setup wizard query fails')
      
      // Get the tenant from user_tenants relationship
      const { data: userTenants, error: userTenantsError } = await db
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', testUser.id)
        .single()
      
      if (userTenantsError) {
        console.error('❌ Error fetching user tenants:', userTenantsError)
        return
      }
      
      console.log(`   Found tenant relationship: ${userTenants.tenant_id}`)
      
      // Fix the users table by adding tenant_id
      console.log('')
      console.log('🔧 Fixing users table...')
      const { error: updateError } = await db
        .from('users')
        .update({ tenant_id: userTenants.tenant_id })
        .eq('id', testUser.id)
      
      if (updateError) {
        console.error('❌ Error updating users table:', updateError)
        return
      }
      
      console.log('   ✅ Updated users table with tenant_id')
      
      // Verify the fix
      const { data: updatedUser, error: verifyError } = await db
        .from('users')
        .select('tenant_id, tenants(id, name)')
        .eq('id', testUser.id)
        .single()
      
      if (verifyError) {
        console.error('❌ Error verifying fix:', verifyError)
        return
      }
      
      console.log('   ✅ Verification:')
      console.log(`      Tenant ID: ${updatedUser.tenant_id}`)
      console.log(`      Tenant Name: ${(updatedUser.tenants as any).name}`)
      
    } else {
      console.log('   ✅ tenant_id is already set')
    }
    
    console.log('')
    console.log('🎯 Fix Complete!')
    console.log('   The setup wizard should now work correctly')
    console.log('   Try the setup wizard again')
    
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message)
  }
}

fixTenantContext()
