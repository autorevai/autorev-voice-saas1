// app/api/voice-config/publish/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { publishVoiceConfig } from '@/lib/voice-config/publisher'

export const maxDuration = 60 // Allow up to 60 seconds for VAPI API calls

export async function POST(req: NextRequest) {
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

    console.log('[VOICE_CONFIG_PUBLISH] Publishing for tenant:', userRecord.tenant_id)

    // This does the actual work - updates VAPI and database
    const result = await publishVoiceConfig(userRecord.tenant_id)

    if (result.success) {
      console.log('[VOICE_CONFIG_PUBLISH] Success! Duration:', result.duration, 'ms')
      return NextResponse.json(result)
    } else {
      console.error('[VOICE_CONFIG_PUBLISH] Failed:', result.error)
      return NextResponse.json(result, { status: 500 })
    }

  } catch (error) {
    console.error('[VOICE_CONFIG_PUBLISH] Unexpected error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unexpected error occurred'
      },
      { status: 500 }
    )
  }
}
