'use server'

import { createClient } from '@/lib/supabase/server' // Regular client for auth
import { createClient as createServiceClient } from '@/lib/db' // Service role for database ops
import { revalidatePath } from 'next/cache'

export async function createTenant(data: { businessName: string; website?: string }) {
  // Use regular client for authentication
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: 'Not authenticated' }

  // Use service client for database operations (bypasses RLS)
  const db = createServiceClient()

  try {
    // Create tenant with minimal data using service client
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .insert({
        name: data.businessName,
        slug: data.businessName.toLowerCase().replace(/\W+/g, '-'),
        website: data.website || null,
        setup_completed: false // They still need to do VAPI setup
      })
      .select()
      .single()

    if (tenantError) return { success: false, error: tenantError.message }

    // Create user record if it doesn't exist
    const { error: userError } = await db.from('users').upsert({
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!,
      tenant_id: tenant.id, // Set tenant_id in users table
    })

    if (userError) {
      // Clean up tenant if user creation fails
      await db.from('tenants').delete().eq('id', tenant.id)
      return { success: false, error: userError.message }
    }

    // Link user to tenant using user_tenants table
    const { error: userTenantError } = await db.from('user_tenants').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      role: 'owner'
    })

    if (userTenantError) {
      // Clean up tenant if user-tenant linking fails
      await db.from('tenants').delete().eq('id', tenant.id)
      return { success: false, error: userTenantError.message }
    }

    revalidatePath('/dashboard')
    return { success: true, tenantId: tenant.id }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return { success: false, error: error.message || 'Failed to create account' }
  }
}