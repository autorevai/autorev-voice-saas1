// lib/auth.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }
  
  return user
}

export async function getCurrentTenant() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = await createClient()
  
  // Get user's tenant memberships
  const { data: memberships, error } = await supabase
    .from('users')
    .select('tenant_id, role, tenants(*)')
    .eq('id', user.id)
    .single()

  if (error || !memberships) {
    return null
  }

  return {
    tenantId: memberships.tenant_id,
    role: memberships.role,
    tenant: memberships.tenants
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user
}

export async function requireTenant() {
  const tenant = await getCurrentTenant()
  if (!tenant) {
    throw new Error('No tenant access')
  }
  return tenant
}
