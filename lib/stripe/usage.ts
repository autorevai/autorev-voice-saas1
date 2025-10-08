import { stripe, STRIPE_CONFIG, PlanTier } from './config'
import { createClient } from '../supabase/server'

export interface UsageData {
  tenantId: string
  minutesUsed: number
  periodStart: Date
  periodEnd: Date
}

export interface UsageTrackingRecord {
  id: string
  tenant_id: string
  subscription_id: string | null
  period_start: string
  period_end: string
  minutes_included: number
  minutes_used: number
  overage_minutes: number
  overage_amount_cents: number
  synced_to_stripe: boolean
}

/**
 * Track usage for a tenant
 */
export async function trackUsage(data: UsageData) {
  const supabase = await createClient()
  
  // Get current subscription
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', data.tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    throw new Error(`Failed to get subscription: ${subError.message}`)
  }

  if (!subscription) {
    throw new Error('No active subscription found')
  }

  const plan = STRIPE_CONFIG.plans[subscription.plan_tier as PlanTier]
  const overageMinutes = Math.max(0, data.minutesUsed - plan.minutesIncluded)
  const overageAmountCents = Math.round(overageMinutes * plan.overageRatePerMinute * 100)

  // Insert or update usage tracking
  const { data: usageRecord, error: usageError } = await supabase
    .from('usage_tracking')
    .upsert({
      tenant_id: data.tenantId,
      subscription_id: subscription.id,
      period_start: data.periodStart.toISOString(),
      period_end: data.periodEnd.toISOString(),
      minutes_included: plan.minutesIncluded,
      minutes_used: data.minutesUsed,
      overage_minutes: overageMinutes,
      overage_amount_cents: overageAmountCents,
      synced_to_stripe: false,
    })
    .select()
    .single()

  if (usageError) {
    throw new Error(`Failed to track usage: ${usageError.message}`)
  }

  return usageRecord
}

/**
 * Get usage for a tenant in a specific period
 */
export async function getUsageForPeriod(tenantId: string, periodStart: Date, periodEnd: Date) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('period_start', periodStart.toISOString())
    .lte('period_end', periodEnd.toISOString())
    .single()

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get usage: ${error.message}`)
  }

  return data
}

/**
 * Get current usage for a tenant
 */
export async function getCurrentUsage(tenantId: string) {
  const supabase = await createClient()
  
  // Get current subscription period
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (subError && subError.code !== 'PGRST116') {
    throw new Error(`Failed to get subscription: ${subError.message}`)
  }

  if (!subscription) {
    return null
  }

  const periodStart = new Date(subscription.current_period_start)
  const periodEnd = new Date(subscription.current_period_end)

  return await getUsageForPeriod(tenantId, periodStart, periodEnd)
}

/**
 * Sync usage overage to Stripe as invoice items
 */
export async function syncUsageToStripe(tenantId: string) {
  const supabase = await createClient()
  
  // Get unsynced usage records
  const { data: usageRecords, error: usageError } = await supabase
    .from('usage_tracking')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('synced_to_stripe', false)
    .gt('overage_amount_cents', 0)

  if (usageError) {
    throw new Error(`Failed to get usage records: ${usageError.message}`)
  }

  if (!usageRecords || usageRecords.length === 0) {
    return { synced: 0 }
  }

  // Get customer ID
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('stripe_customer_id')
    .eq('id', tenantId)
    .single()

  if (tenantError) {
    throw new Error(`Failed to get customer ID: ${tenantError.message}`)
  }

  if (!tenant.stripe_customer_id) {
    throw new Error('No Stripe customer ID found')
  }

  let syncedCount = 0

  for (const record of usageRecords) {
    try {
      // Create invoice item for overage
      await stripe.invoiceItems.create({
        customer: tenant.stripe_customer_id,
        amount: record.overage_amount_cents,
        currency: STRIPE_CONFIG.currency,
        description: `Overage: ${record.overage_minutes} minutes`,
        metadata: {
          tenant_id: tenantId,
          usage_tracking_id: record.id,
          period_start: record.period_start,
          period_end: record.period_end,
        },
      })

      // Mark as synced
      await supabase
        .from('usage_tracking')
        .update({ synced_to_stripe: true })
        .eq('id', record.id)

      syncedCount++
    } catch (error) {
      console.error(`Failed to sync usage record ${record.id}:`, error)
    }
  }

  return { synced: syncedCount }
}
