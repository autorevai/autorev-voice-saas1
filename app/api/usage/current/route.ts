import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STRIPE_CONFIG } from '@/lib/stripe/config'

// GET current usage for logged-in user's tenant
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
      .select('plan_tier, current_period_start, current_period_end, subscription_status')
      .eq('id', tenantId)
      .single()

    if (!tenant || !tenant.plan_tier) {
      return NextResponse.json({ 
        error: 'No active subscription',
        message: 'Please choose a plan to get started'
      }, { status: 404 })
    }

    // Get current period usage
    const { data: usage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('period_end', new Date().toISOString())
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    const plan = STRIPE_CONFIG.plans[tenant.plan_tier as keyof typeof STRIPE_CONFIG.plans]

    if (!usage) {
      // No usage_tracking record - calculate from calls table for current period
      const periodStart = tenant.current_period_start || new Date().toISOString()
      const periodEnd = tenant.current_period_end || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      const { data: calls } = await supabase
        .from('calls')
        .select('duration_sec')
        .eq('tenant_id', tenantId)
        .gte('started_at', periodStart)
        .lte('started_at', periodEnd)

      const totalSeconds = calls?.reduce((sum, c) => sum + (c.duration_sec || 0), 0) || 0
      const minutesUsed = Math.ceil(totalSeconds / 60)
      const overageMinutes = Math.max(0, minutesUsed - plan.minutesIncluded)
      const overageAmount = Math.round(overageMinutes * 15) // $0.15/min = 15 cents

      return NextResponse.json({
        minutesUsed,
        minutesIncluded: plan.minutesIncluded,
        overageMinutes,
        overageAmount,
        periodEnd,
        planTier: tenant.plan_tier
      })
    }

    // Calculate overage
    const overageMinutes = Math.max(0, usage.minutes_used - usage.minutes_included)
    const overageAmount = Math.round(overageMinutes * 15) // $0.15/min = 15 cents

    return NextResponse.json({
      minutesUsed: usage.minutes_used,
      minutesIncluded: usage.minutes_included,
      overageMinutes,
      overageAmount,
      periodEnd: usage.period_end,
      planTier: tenant.plan_tier
    })

  } catch (error) {
    console.error('Usage fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    )
  }
}

// POST - Update usage when a call ends
export async function POST(req: NextRequest) {
  try {
    const { tenantId, durationSeconds } = await req.json()

    if (!tenantId || !durationSeconds) {
      return NextResponse.json(
        { error: 'Missing tenantId or durationSeconds' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Round up to nearest minute
    const durationMinutes = Math.ceil(durationSeconds / 60)

    // Get tenant's current subscription
    const { data: tenant } = await supabase
      .from('tenants')
      .select('plan_tier, current_period_start, current_period_end, subscription_status')
      .eq('id', tenantId)
      .single()

    if (!tenant || !tenant.plan_tier) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 404 }
      )
    }

    const plan = STRIPE_CONFIG.plans[tenant.plan_tier as keyof typeof STRIPE_CONFIG.plans]

    // Get or create current period usage record
    const { data: existingUsage } = await supabase
      .from('usage_tracking')
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('period_end', new Date().toISOString())
      .order('period_start', { ascending: false })
      .limit(1)
      .single()

    if (existingUsage) {
      // Update existing usage
      const newMinutesUsed = existingUsage.minutes_used + durationMinutes
      const overageMinutes = Math.max(0, newMinutesUsed - plan.minutesIncluded)
      const overageAmount = Math.round(overageMinutes * 15) // 15 cents per minute

      const { error } = await supabase
        .from('usage_tracking')
        .update({
          minutes_used: newMinutesUsed,
          overage_minutes: overageMinutes,
          overage_amount_cents: overageAmount,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUsage.id)

      if (error) throw error

      // Check if we should send usage alerts
      const usagePercent = (newMinutesUsed / plan.minutesIncluded) * 100
      const oldPercent = (existingUsage.minutes_used / plan.minutesIncluded) * 100

      // Alert at 80%, 90%, 100%
      const thresholds = [80, 90, 100]
      for (const threshold of thresholds) {
        if (oldPercent < threshold && usagePercent >= threshold) {
          console.log(`🚨 Usage alert: ${threshold}% threshold reached for tenant ${tenantId}`)
          // TODO: Send email/webhook notification
        }
      }

      return NextResponse.json({
        success: true,
        minutesUsed: newMinutesUsed,
        overageMinutes,
        overageAmount,
        thresholdReached: usagePercent >= 80
      })
    } else {
      // Create new usage record for this period
      const periodStart = tenant.current_period_start 
        ? new Date(tenant.current_period_start) 
        : new Date()
      
      const periodEnd = tenant.current_period_end 
        ? new Date(tenant.current_period_end) 
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      const overageMinutes = Math.max(0, durationMinutes - plan.minutesIncluded)
      const overageAmount = Math.round(overageMinutes * 15)

      const { error } = await supabase
        .from('usage_tracking')
        .insert({
          tenant_id: tenantId,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          minutes_included: plan.minutesIncluded,
          minutes_used: durationMinutes,
          overage_minutes: overageMinutes,
          overage_amount_cents: overageAmount,
          synced_to_stripe: false
        })

      if (error) throw error

      return NextResponse.json({
        success: true,
        minutesUsed: durationMinutes,
        overageMinutes,
        overageAmount,
        newRecord: true
      })
    }

  } catch (error) {
    console.error('Usage update error:', error)
    return NextResponse.json(
      { error: 'Failed to update usage' },
      { status: 500 }
    )
  }
}

export const dynamic = 'force-dynamic'
