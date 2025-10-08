import { stripe, STRIPE_CONFIG, PlanTier } from './config'
import { createClient } from '../supabase/server'

export interface CreateSubscriptionData {
  customerId: string
  tenantId: string
  planTier: PlanTier
  trialDays?: number
}

export interface UpdateSubscriptionData {
  planTier?: PlanTier
  cancelAtPeriodEnd?: boolean
}

/**
 * Create a new subscription
 */
export async function createSubscription(data: CreateSubscriptionData) {
  const plan = STRIPE_CONFIG.plans[data.planTier]
  
  if (!plan.priceId) {
    throw new Error(`Price ID not configured for plan: ${data.planTier}`)
  }

  const subscription = await stripe.subscriptions.create({
    customer: data.customerId,
    items: [
      {
        price: plan.priceId,
      },
    ],
    trial_period_days: data.trialDays || STRIPE_CONFIG.trial.durationDays,
    metadata: {
      tenant_id: data.tenantId,
      plan_tier: data.planTier,
    },
    expand: ['latest_invoice.payment_intent'],
  })

  return subscription
}

/**
 * Update an existing subscription
 */
export async function updateSubscription(subscriptionId: string, data: UpdateSubscriptionData) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  if (data.planTier && data.planTier !== subscription.metadata.plan_tier) {
    const plan = STRIPE_CONFIG.plans[data.planTier]
    
    if (!plan.priceId) {
      throw new Error(`Price ID not configured for plan: ${data.planTier}`)
    }

    // Update subscription with new plan
    await stripe.subscriptions.update(subscriptionId, {
      items: [
        {
          id: subscription.items.data[0].id,
          price: plan.priceId,
        },
      ],
      metadata: {
        ...subscription.metadata,
        plan_tier: data.planTier,
      },
    })
  }

  if (data.cancelAtPeriodEnd !== undefined) {
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: data.cancelAtPeriodEnd,
    })
  }

  return await stripe.subscriptions.retrieve(subscriptionId)
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.cancel(subscriptionId)
  return subscription
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  return subscription
}

/**
 * Sync subscription to database
 */
export async function syncSubscriptionToDatabase(subscription: any, tenantId: string) {
  const supabase = await createClient()
  
  // Update tenant table
  const { error: tenantError } = await supabase
    .from('tenants')
    .update({
      stripe_subscription_id: subscription.id,
      subscription_status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      plan_tier: subscription.metadata.plan_tier,
    })
    .eq('id', tenantId)

  if (tenantError) {
    throw new Error(`Failed to update tenant: ${tenantError.message}`)
  }

  // Insert/update detailed subscription record
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .upsert({
      tenant_id: tenantId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: subscription.customer,
      status: subscription.status,
      plan_tier: subscription.metadata.plan_tier,
      price_id: subscription.items.data[0].price.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })

  if (subscriptionError) {
    throw new Error(`Failed to sync subscription: ${subscriptionError.message}`)
  }
}

/**
 * Get subscription by tenant ID from database
 */
export async function getSubscriptionByTenantId(tenantId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to get subscription: ${error.message}`)
  }

  return data
}
