// app/api/voice-config/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_VOICE_CONFIG, VoiceConfig } from '@/lib/voice-config/types'
import { INDUSTRY_SERVICE_DEFAULTS, INDUSTRY_KEY_INFO } from '@/lib/voice-config/service-defaults'

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

    // Get tenant with voice config
    const { data: tenant, error } = await supabase
      .from('tenants')
      .select('voice_config, voice_config_published_at, voice_config_pending_changes, industry')
      .eq('id', userRecord.tenant_id)
      .single()

    if (error) {
      console.error('[VOICE_CONFIG_API] Error fetching config:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Auto-populate config from industry if it doesn't exist
    let config: VoiceConfig = tenant?.voice_config as VoiceConfig

    if (!config && tenant?.industry) {
      // First time loading - auto-populate from industry
      const industry = tenant.industry.toLowerCase()
      const defaultServices = INDUSTRY_SERVICE_DEFAULTS[industry] || []
      const defaultKeyInfo = INDUSTRY_KEY_INFO[industry] || []

      config = {
        ...DEFAULT_VOICE_CONFIG,
        services: defaultServices,
        keyInfo: defaultKeyInfo
      }

      // Save the auto-populated config
      await supabase
        .from('tenants')
        .update({
          voice_config: config,
          voice_config_pending_changes: true
        })
        .eq('id', userRecord.tenant_id)

      console.log('[VOICE_CONFIG_API] Auto-populated config for industry:', industry)
    } else if (!config) {
      config = DEFAULT_VOICE_CONFIG
    }

    return NextResponse.json({
      config,
      lastPublished: tenant?.voice_config_published_at,
      hasPendingChanges: tenant?.voice_config_pending_changes || false
    })

  } catch (error) {
    console.error('[VOICE_CONFIG_API] GET error:', error)
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

    // Parse updates from request body
    const updates = await req.json()

    // Validate basic structure (you can add more validation here)
    if (!updates.voice || !updates.style) {
      return NextResponse.json(
        { error: 'Invalid configuration' },
        { status: 400 }
      )
    }

    // Update config and mark as having pending changes
    const { error } = await supabase
      .from('tenants')
      .update({
        voice_config: updates,
        voice_config_pending_changes: true
      })
      .eq('id', userRecord.tenant_id)

    if (error) {
      console.error('[VOICE_CONFIG_API] Update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('[VOICE_CONFIG_API] Configuration updated, pending publish')

    return NextResponse.json({
      success: true,
      hasPendingChanges: true
    })

  } catch (error) {
    console.error('[VOICE_CONFIG_API] PUT error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
