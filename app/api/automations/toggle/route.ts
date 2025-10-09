// app/api/automations/toggle/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { automationId, enabled } = await req.json()

    if (!automationId || typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
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

    // Map automation IDs to database columns
    const columnMap: Record<string, string> = {
      'smart-call-recovery': 'missed_call_rescue_enabled',
      // Add more automations as they're implemented
      // 'after-hours': 'after_hours_scheduling_enabled',
      // 'text-to-pay': 'text_to_pay_enabled',
      // 'review-engine': 'review_engine_enabled'
    }

    const column = columnMap[automationId]
    if (!column) {
      return NextResponse.json({ error: 'Unknown automation' }, { status: 400 })
    }

    // Update tenant settings
    const { error } = await supabase
      .from('tenants')
      .update({ [column]: enabled })
      .eq('id', userRecord.tenant_id)

    if (error) {
      console.error('[AUTOMATION_TOGGLE] Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`[AUTOMATION_TOGGLE] ${automationId} ${enabled ? 'enabled' : 'disabled'} for tenant ${userRecord.tenant_id}`)

    return NextResponse.json({ success: true, enabled })

  } catch (error) {
    console.error('[AUTOMATION_TOGGLE] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
