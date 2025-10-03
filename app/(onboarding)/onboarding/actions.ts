'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface OnboardingData {
  businessName: string
  industry: string
  phone: string
  serviceArea: string
  website?: string
  hoursOfOperation?: string
}

export async function createTenant(data: OnboardingData) {
  const supabase = await createClient()
  
  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return {
      success: false,
      error: 'Not authenticated'
    }
  }

  try {
    // Create tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert([
        {
          business_name: data.businessName,
          industry: data.industry,
          phone: data.phone,
          website: data.website,
          hours_of_operation: data.hoursOfOperation,
          service_area: data.serviceArea,
          status: 'active',
        },
      ])
      .select()
      .single()

    if (tenantError) {
      console.error('Tenant creation error:', tenantError)
      return {
        success: false,
        error: tenantError.message
      }
    }

    // Create user record linked to tenant
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: user.id,
          tenant_id: tenant.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || '',
          role: 'owner',
        },
      ])

    if (userError) {
      console.error('User creation error:', userError)
      // Try to clean up tenant if user creation fails
      await supabase.from('tenants').delete().eq('id', tenant.id)
      return {
        success: false,
        error: userError.message
      }
    }

    revalidatePath('/dashboard')
    
    return {
      success: true,
      tenantId: tenant.id,
      message: 'Account created successfully!'
    }
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return {
      success: false,
      error: error.message || 'Failed to create account'
    }
  }
}