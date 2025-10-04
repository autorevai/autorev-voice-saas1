'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createTenant(data: { businessName: string; website?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { success: false, error: 'Not authenticated' }

  try {
    // Create tenant with minimal data
    const { data: tenant, error: tenantError } = await supabase
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

    // Link user to tenant
    const { error: userError } = await supabase.from('users').upsert({
      id: user.id,
      tenant_id: tenant.id,
      email: user.email!,
      name: user.user_metadata?.full_name || user.email!,
    })

    if (userError) {
      // Clean up tenant if user creation fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return { success: false, error: userError.message }
    }

    revalidatePath('/dashboard')
    return { success: true, tenantId: tenant.id }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return { success: false, error: error.message || 'Failed to create account' }
  }
}