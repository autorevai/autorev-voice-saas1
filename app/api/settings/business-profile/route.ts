// app/api/settings/business-profile/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: userRecord } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    // Get tenant info
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('id, name, website, industry')
      .eq('id', userRecord.tenant_id)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      businessName: tenant.name,
      website: tenant.website,
      industry: tenant.industry
    })

  } catch (error) {
    console.error('[BUSINESS_PROFILE_API] GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: userRecord } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const { businessName, website } = await req.json()

    if (!businessName?.trim()) {
      return NextResponse.json(
        { error: 'Business name is required' },
        { status: 400 }
      )
    }

    // Update tenant name and website
    const { error } = await supabase
      .from('tenants')
      .update({
        name: businessName.trim(),
        website: website?.trim() || null,
      })
      .eq('id', userRecord.tenant_id)

    if (error) {
      console.error('[BUSINESS_PROFILE_API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[BUSINESS_PROFILE_API] Business profile updated:', businessName)

    return NextResponse.json({
      success: true,
      businessName: businessName.trim()
    })

  } catch (error) {
    console.error('[BUSINESS_PROFILE_API] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
