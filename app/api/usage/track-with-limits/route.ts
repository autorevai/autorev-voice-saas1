import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TRIAL_LIMITS, isTrialLimitExceeded } from '@/lib/stripe/trial-limits'
import { STRIPE_CONFIG } from '@/lib/stripe/config'

// Track call usage with dual limit enforcement (10 calls OR 25 minutes)
export async function POST(req: NextRequest) {
  try {
    const { tenantId, durationSeconds, callId } = await req.json()

    if (!tenantId || durationSeconds === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, durationSeconds' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const durationMinutes = Math.ceil(durationSeconds / 60)

    // Get tenant subscription status
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('plan_tier, subscription_status, current_period_end')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const isOnTrial = tenant.subscription_status === 'trialing'

    // Get current usage for this billing period
    const { data: existingUsage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('period_end', new Date().toISOString())
      .single()

    if (existingUsage) {
      // Calculate new usage
      const currentMinutes = existingUsage.minutes_used || 0
      const currentCalls = existingUsage.call_count || 0
      const newMinutes = currentMinutes + durationMinutes
      const newCalls = currentCalls + 1

      // ===== DUAL LIMIT CHECK FOR TRIAL =====
      if (isOnTrial) {
        const limitCheck = isTrialLimitExceeded(newMinutes, newCalls)

        if (limitCheck.exceeded) {
          console.warn(`🚫 Trial ${limitCheck.limitType} limit exceeded for tenant ${tenantId}:`, {
            minutesUsed: newMinutes,
            minutesLimit: TRIAL_LIMITS.minutesIncluded,
            callsUsed: newCalls,
            callsLimit: TRIAL_LIMITS.callsIncluded,
            limitType: limitCheck.limitType
          })

          // Cap at limit (don't let it go over)
          await supabase
            .from('usage_tracking')
            .update({
              minutes_used: Math.min(newMinutes, TRIAL_LIMITS.minutesIncluded),
              call_count: Math.min(newCalls, TRIAL_LIMITS.callsIncluded),
              updated_at: new Date().toISOString()
            })
            .eq('id', existingUsage.id)

          return NextResponse.json({
            error: 'TRIAL_LIMIT_EXCEEDED',
            limitType: limitCheck.limitType,
            message: limitCheck.message,
            minutesUsed: Math.min(newMinutes, TRIAL_LIMITS.minutesIncluded),
            minutesLimit: TRIAL_LIMITS.minutesIncluded,
            callsUsed: Math.min(newCalls, TRIAL_LIMITS.callsIncluded),
            callsLimit: TRIAL_LIMITS.callsIncluded,
            redirectTo: '/pricing',
            trialEnded: true
          }, { status: 402 }) // 402 Payment Required
        }
      }

      // Normal update (under limit or on paid plan)
      let overageMinutes = 0
      let overageAmount = 0

      if (!isOnTrial) {
        const plan = STRIPE_CONFIG.plans[tenant.plan_tier as keyof typeof STRIPE_CONFIG.plans]
        if (plan) {
          overageMinutes = Math.max(0, newMinutes - plan.minutesIncluded)
          overageAmount = Math.round(overageMinutes * (plan.overageRatePerMinute * 100)) // cents
        }
      }

      const { error: updateError } = await supabase
        .from('usage_tracking')
        .update({
          minutes_used: newMinutes,
          call_count: newCalls,
          overage_minutes: overageMinutes,
          overage_amount_cents: overageAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id)

      if (updateError) {
        console.error('Usage update error:', updateError)
        return NextResponse.json(
          { error: 'Failed to update usage' },
          { status: 500 }
        )
      }

      // Calculate threshold warnings
      const minutesLimit = isOnTrial ? TRIAL_LIMITS.minutesIncluded : (STRIPE_CONFIG.plans[tenant.plan_tier as keyof typeof STRIPE_CONFIG.plans]?.minutesIncluded || 0)
      const callsLimit = isOnTrial ? TRIAL_LIMITS.callsIncluded : null
      const usagePercent = isOnTrial
        ? Math.max((newMinutes / TRIAL_LIMITS.minutesIncluded) * 100, (newCalls / TRIAL_LIMITS.callsIncluded) * 100)
        : (newMinutes / minutesLimit) * 100

      return NextResponse.json({
        success: true,
        minutesUsed: newMinutes,
        callsUsed: newCalls,
        minutesLimit,
        callsLimit,
        overageMinutes,
        overageAmount,
        thresholdReached: usagePercent >= 70,
        warningAt90: usagePercent >= 90,
        isOnTrial,
        callId
      })
    }

    // Create new usage record (first call of billing period)
    const periodStart = new Date()
    const periodEnd = new Date(tenant.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000))

    const { error: createError } = await supabase
      .from('usage_tracking')
      .insert({
        tenant_id: tenantId,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        minutes_used: durationMinutes,
        call_count: 1,
        overage_minutes: 0,
        overage_amount_cents: 0
      })

    if (createError) {
      console.error('Usage creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create usage record' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      minutesUsed: durationMinutes,
      callsUsed: 1,
      minutesLimit: isOnTrial ? TRIAL_LIMITS.minutesIncluded : 0,
      callsLimit: isOnTrial ? TRIAL_LIMITS.callsIncluded : null,
      overageMinutes: 0,
      overageAmount: 0,
      thresholdReached: false,
      isOnTrial,
      callId
    })

  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get current usage with dual metrics
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId')

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Missing tenantId parameter' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { data: tenant } = await supabase
      .from('tenants')
      .select('plan_tier, subscription_status, current_period_end')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      )
    }

    const isOnTrial = tenant.subscription_status === 'trialing'

    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('period_end', new Date().toISOString())
      .single()

    const minutesUsed = usage?.minutes_used || 0
    const callsUsed = usage?.call_count || 0

    if (isOnTrial) {
      // Return trial-specific limits with both metrics
      const limitCheck = isTrialLimitExceeded(minutesUsed, callsUsed)

      return NextResponse.json({
        minutesUsed,
        minutesIncluded: TRIAL_LIMITS.minutesIncluded,
        callsUsed,
        callsIncluded: TRIAL_LIMITS.callsIncluded,
        minutesRemaining: Math.max(0, TRIAL_LIMITS.minutesIncluded - minutesUsed),
        callsRemaining: Math.max(0, TRIAL_LIMITS.callsIncluded - callsUsed),
        overageMinutes: 0,
        overageAmount: 0,
        periodEnd: tenant.current_period_end,
        planTier: tenant.plan_tier,
        isOnTrial: true,
        limitExceeded: limitCheck.exceeded,
        limitType: limitCheck.limitType,
        limitMessage: limitCheck.message
      })
    }

    // Return paid plan limits
    const plan = STRIPE_CONFIG.plans[tenant.plan_tier as keyof typeof STRIPE_CONFIG.plans]
    const overageMinutes = Math.max(0, minutesUsed - (plan?.minutesIncluded || 0))
    const overageAmount = usage?.overage_amount_cents || 0

    return NextResponse.json({
      minutesUsed,
      minutesIncluded: plan?.minutesIncluded || 0,
      callsUsed,
      callsIncluded: null, // No call limit on paid plans
      overageMinutes,
      overageAmount,
      periodEnd: tenant.current_period_end,
      planTier: tenant.plan_tier,
      isOnTrial: false,
      limitExceeded: false
    })

  } catch (error) {
    console.error('Get usage error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
