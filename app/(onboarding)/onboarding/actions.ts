'use server'

import { createClient } from '../../../lib/db'

interface CreateTenantData {
  name: string
  slug: string
  email: string
  phone: string
  hours: string
  zips: string
}

interface CreateTenantResult {
  success: boolean
  tenantId?: string
  error?: string
}

export async function createTenant(formData: CreateTenantData): Promise<CreateTenantResult> {
  try {
    const db = createClient()
    
    // Validate required fields
    if (!formData.name?.trim()) {
      return { success: false, error: 'Company name is required' }
    }
    
    if (!formData.slug?.trim()) {
      return { success: false, error: 'Slug is required' }
    }
    
    if (!formData.email?.trim()) {
      return { success: false, error: 'Email is required' }
    }
    
    if (!formData.phone?.trim()) {
      return { success: false, error: 'Phone number is required' }
    }
    
    if (!formData.hours?.trim()) {
      return { success: false, error: 'Service hours are required' }
    }
    
    if (!formData.zips?.trim()) {
      return { success: false, error: 'At least one ZIP code is required' }
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/
    if (!slugRegex.test(formData.slug)) {
      return { 
        success: false, 
        error: 'Slug can only contain lowercase letters, numbers, and hyphens' 
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return { 
        success: false, 
        error: 'Please enter a valid email address' 
      }
    }

    // Validate ZIP codes format
    const zipList = formData.zips.split(',').map(zip => zip.trim())
    const invalidZips = zipList.filter(zip => !/^\d{5}$/.test(zip))
    if (invalidZips.length > 0) {
      return { 
        success: false, 
        error: 'All ZIP codes must be 5 digits' 
      }
    }

    // Check if slug is already taken
    const { data: existingTenant, error: checkError } = await db
      .from('tenants')
      .select('id, slug')
      .eq('slug', formData.slug)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 is "not found" error, which is what we want
      console.error('Error checking slug uniqueness:', checkError)
      return { 
        success: false, 
        error: 'Failed to validate slug availability' 
      }
    }

    if (existingTenant) {
      return { 
        success: false, 
        error: 'This slug is already taken. Please choose a different one.' 
      }
    }

    // Create the tenant
    const { data: newTenant, error: insertError } = await db
    .from('tenants')
    .insert({
      name: formData.name.trim(),
      slug: formData.slug.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      hours: formData.hours.trim(),
      service_zips: formData.zips.trim()  // Note: "zips" → "service_zips"
    })
    .select()
    .single()

    if (insertError) {
      console.error('Error creating tenant:', insertError)
      return { 
        success: false, 
        error: 'Failed to create tenant. Please try again.' 
      }
    }

    if (!newTenant) {
      return { 
        success: false, 
        error: 'Failed to create tenant. Please try again.' 
      }
    }

    return { 
      success: true, 
      tenantId: newTenant.id 
    }

  } catch (error) {
    console.error('Unexpected error in createTenant:', error)
    return { 
      success: false, 
      error: 'An unexpected error occurred. Please try again.' 
    }
  }
}
