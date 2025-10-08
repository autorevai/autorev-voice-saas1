import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe, STRIPE_CONFIG } from '@/lib/stripe/config'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planTier, tenantId } = await req.json()

    if (!planTier || !tenantId) {
      return NextResponse.json({ error: 'Missing planTier or tenantId' }, { status: 400 })
    }

    // Get the plan config
    const plan = STRIPE_CONFIG.plans[planTier as keyof typeof STRIPE_CONFIG.plans]

    if (!plan || !plan.priceId) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 })
    }

    // Get or create Stripe customer
    const { data: tenant } = await supabase
      .from('tenants')
      .select('stripe_customer_id')
      .eq('id', tenantId)
      .single()

    let customerId = tenant?.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          tenant_id: tenantId,
          user_id: user.id
        }
      })

      customerId = customer.id

      // Save customer ID to tenant
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId)
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
      subscription_data: {
        trial_period_days: plan.trialDays || 14,
        metadata: {
          tenant_id: tenantId,
        },
      },
      metadata: {
        tenant_id: tenantId,
        plan_tier: planTier,
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
