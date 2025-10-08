// app/api/trial/upgrade-now/route.ts
// API to immediately convert trial to paid subscription

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@/lib/db'
import { stripe } from '@/lib/stripe/config'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const db = createServiceClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
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

    const tenantId = userRecord.tenant_id

    // Get tenant with Stripe info
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('stripe_subscription_id, stripe_customer_id, stripe_subscription_status, trial_blocked')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Verify tenant is in trial
    if (tenant.stripe_subscription_status !== 'trialing') {
      return NextResponse.json({
        error: 'Not in trial period',
        status: tenant.stripe_subscription_status
      }, { status: 400 })
    }

    if (!tenant.stripe_subscription_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    console.log(`[TRIAL_UPGRADE] Converting trial to paid for tenant ${tenantId}`)

    // End trial immediately (this charges the customer now)
    const subscription = await stripe.subscriptions.update(
      tenant.stripe_subscription_id,
      {
        trial_end: 'now', // Magic! Charges immediately
        billing_cycle_anchor: 'now',
        proration_behavior: 'none' // Don't prorate
      }
    )

    console.log(`[TRIAL_UPGRADE] Stripe subscription updated:`, subscription.id)

    // Unblock trial and reset usage counters
    await db.rpc('unblock_trial', {
      p_tenant_id: tenantId
    })

    // Update subscription status
    await db
      .from('tenants')
      .update({
        stripe_subscription_status: 'active'
      })
      .eq('id', tenantId)

    console.log(`[TRIAL_UPGRADE] Trial unblocked and converted to active`)

    return NextResponse.json({
      success: true,
      message: 'Subscription activated successfully',
      subscription: {
        id: subscription.id,
        status: subscription.status,
        current_period_end: (subscription as any).current_period_end
      }
    })

  } catch (error: any) {
    console.error('[TRIAL_UPGRADE] Error:', error)

    return NextResponse.json({
      error: 'Failed to upgrade subscription',
      details: error.message
    }, { status: 500 })
  }
}
