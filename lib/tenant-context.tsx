'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Tenant {
  id: string
  business_name: string
  industry?: string
  phone?: string
}

interface TenantContextType {
  currentTenant: Tenant | null
  tenants: Tenant[]
  switchTenant: (tenantId: string) => Promise<void>
  loading: boolean
  refetch: () => Promise<void>
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

export function TenantProvider({ children }: { children: ReactNode }) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  
  let supabase: any = null
  try {
    supabase = createClient()
  } catch (error) {
    console.warn('Supabase client creation failed:', error)
  }

  async function fetchTenants() {
    setLoading(true)
    
    if (!supabase) {
      setLoading(false)
      return
    }
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        setLoading(false)
        return
      }

      // Get user's tenant access with explicit field selection
      const { data: userRecord } = await supabase
        .from('users')
        .select('tenant_id, tenants(id, business_name, industry, phone)')
        .eq('id', user.id)
        .single()

      if (userRecord?.tenants) {
        // Cast through unknown to satisfy TypeScript
        const tenant = userRecord.tenants as unknown as Tenant
        setCurrentTenant(tenant)
        setTenants([tenant])
      }
    } catch (error) {
      console.warn('Failed to fetch tenants:', error)
      // Gracefully handle missing environment variables
    }

    setLoading(false)
  }

  async function switchTenant(tenantId: string) {
    const tenant = tenants.find(t => t.id === tenantId)
    if (tenant) {
      setCurrentTenant(tenant)
      // Store preference in localStorage
      localStorage.setItem('selectedTenantId', tenantId)
    }
  }

  useEffect(() => {
    fetchTenants()

    if (supabase) {
      // Subscribe to auth changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        fetchTenants()
      })

      return () => subscription.unsubscribe()
    }
  }, [])

  return (
    <TenantContext.Provider 
      value={{ 
        currentTenant, 
        tenants, 
        switchTenant, 
        loading,
        refetch: fetchTenants 
      }}
    >
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}
