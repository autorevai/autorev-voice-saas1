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
      .select('subscription_status, trial_ends_at, plan_tier, current_period_end')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    // Calculate days remaining in trial
    let daysRemaining = 0
    if (tenant.trial_ends_at) {
      const trialEnd = new Date(tenant.trial_ends_at)
      const now = new Date()
      daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    }

    return NextResponse.json({
      status: tenant.subscription_status,
      trialEndsAt: tenant.trial_ends_at,
      planTier: tenant.plan_tier,
      daysRemaining: Math.max(0, daysRemaining),
      periodEnd: tenant.current_period_end
    })

  } catch (error) {
    console.error('Subscription status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription status' },
      { status: 500 }
    )
  }
}
