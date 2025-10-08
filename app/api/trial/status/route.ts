// app/api/trial/status/route.ts
// API to get current trial status

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTrialVariant, getDaysRemaining } from '@/lib/trial/config'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userRecord } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 404 })
    }

    // Get trial status
    const { data: tenant } = await supabase
      .from('tenants')
      .select(`
        trial_calls_used,
        trial_minutes_used,
        trial_blocked,
        trial_blocked_at,
        trial_variant,
        stripe_subscription_status,
        stripe_trial_end
      `)
      .eq('id', userRecord.tenant_id)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Get variant limits
    const variant = getTrialVariant(tenant.trial_variant || userRecord.tenant_id)

    const daysRemaining = tenant.stripe_trial_end
      ? getDaysRemaining(new Date(tenant.stripe_trial_end))
      : 0

    return NextResponse.json({
      isInTrial: tenant.stripe_subscription_status === 'trialing',
      isBlocked: tenant.trial_blocked,
      blockedAt: tenant.trial_blocked_at,
      usage: {
        calls: {
          used: tenant.trial_calls_used,
          limit: variant.limits.calls,
          remaining: Math.max(0, variant.limits.calls - tenant.trial_calls_used)
        },
        minutes: {
          used: tenant.trial_minutes_used,
          limit: variant.limits.minutes,
          remaining: Math.max(0, variant.limits.minutes - tenant.trial_minutes_used)
        }
      },
      daysRemaining,
      trialEndDate: tenant.stripe_trial_end,
      variant: {
        name: variant.name,
        description: variant.description,
        behavior: variant.behavior,
        allowWaitForAutoConvert: variant.allowWaitForAutoConvert
      }
    })

  } catch (error: any) {
    console.error('[TRIAL_STATUS] Error:', error)
    return NextResponse.json({
      error: 'Failed to get trial status',
      details: error.message
    }, { status: 500 })
  }
}
