import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { STRIPE_CONFIG } from '@/lib/stripe/config'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia'
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { planTier, tenantId } = await req.json()
    
    if (!planTier || !STRIPE_CONFIG.plans[planTier as keyof typeof STRIPE_CONFIG.plans]) {
      return NextResponse.json({ error: 'Invalid plan tier' }, { status: 400 })
    }

    // Get or create tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, stripe_customer_id')
      .eq('id', tenantId)
      .single()

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Create or get Stripe customer
    let customerId = tenant.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: {
          tenant_id: tenant.id,
          user_id: user.id
        }
      })
      customerId = customer.id
      
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenant.id)
    }

    const plan = STRIPE_CONFIG.plans[planTier as keyof typeof STRIPE_CONFIG.plans]
    
    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.priceId,
          quantity: 1
        }
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?setup=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: STRIPE_CONFIG.trial.durationDays,
        metadata: {
          tenant_id: tenant.id,
          plan_tier: planTier,
          minutes_included: plan.minutesIncluded.toString()
        }
      },
      metadata: {
        tenant_id: tenant.id,
        plan_tier: planTier
      }
    })

    return NextResponse.json({ 
      sessionId: session.id,
      url: session.url 
    })
    
  } catch (error) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}
