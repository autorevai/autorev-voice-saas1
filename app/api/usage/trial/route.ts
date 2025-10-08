import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TRIAL_LIMITS, isTrialLimitExceeded } from '@/lib/stripe/trial-limits'

// GET trial usage for logged-in user's tenant
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single()

    if (!userTenant) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    const tenantId = userTenant.tenant_id

    // Get tenant subscription info
    const { data: tenant } = await supabase
      .from('tenants')
      .select('subscription_status, trial_ends_at')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Only return trial usage if tenant is actually in trial
    if (tenant.subscription_status !== 'trialing') {
      return NextResponse.json({
        error: 'Not in trial',
        isTrial: false
      }, { status: 400 })
    }

    // Calculate usage from calls table - aggregate duration
    const { data: calls, error: callsError } = await supabase
      .from('calls')
      .select('duration_sec')
      .eq('tenant_id', tenantId)

    if (callsError) {
      console.error('Error fetching calls:', callsError)
      return NextResponse.json({ error: 'Failed to fetch calls' }, { status: 500 })
    }

    // Calculate totals
    const callsUsed = calls?.length || 0
    const totalSeconds = calls?.reduce((sum, call) => sum + (call.duration_sec || 0), 0) || 0
    const minutesUsed = Math.ceil(totalSeconds / 60) // Round up to nearest minute

    // Check if limit exceeded
    const limitCheck = isTrialLimitExceeded(minutesUsed, callsUsed)

    return NextResponse.json({
      isTrial: true,
      minutesUsed,
      minutesIncluded: TRIAL_LIMITS.minutesIncluded,
      callsUsed,
      callsIncluded: TRIAL_LIMITS.callsIncluded,
      limitExceeded: limitCheck.exceeded,
      limitType: limitCheck.limitType,
      trialEndsAt: tenant.trial_ends_at
    })

  } catch (error) {
    console.error('Trial usage fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trial usage' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
