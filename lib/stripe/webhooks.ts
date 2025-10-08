import { stripe, STRIPE_CONFIG } from './config'
import { syncCustomerToDatabase, getCustomerByTenantId } from './customer'
import { syncSubscriptionToDatabase, getSubscriptionByTenantId } from './subscription'
import { createClient } from '../supabase/server'

export interface WebhookEvent {
  id: string
  type: string
  data: {
    object: any
  }
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(payload: string, signature: string) {
  if (!STRIPE_CONFIG.WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not set')
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      STRIPE_CONFIG.WEBHOOK_SECRET
    )
    return event
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`)
  }
}

/**
 * Handle customer.created event
 */
export async function handleCustomerCreated(event: WebhookEvent) {
  const customer = event.data.object
  
  // Find tenant by customer metadata
  const tenantId = customer.metadata?.tenant_id
  if (!tenantId) {
    console.warn('Customer created without tenant_id metadata')
    return
  }

  try {
    await syncCustomerToDatabase(customer.id, tenantId)
    console.log(`Customer ${customer.id} synced for tenant ${tenantId}`)
  } catch (error) {
    console.error(`Failed to sync customer ${customer.id}:`, error)
    throw error
  }
}

/**
 * Handle customer.updated event
 */
export async function handleCustomerUpdated(event: WebhookEvent) {
  const customer = event.data.object
  
  // Find tenant by customer metadata
  const tenantId = customer.metadata?.tenant_id
  if (!tenantId) {
    console.warn('Customer updated without tenant_id metadata')
    return
  }

  try {
    // Update tenant with customer info
    const supabase = await createClient()
    await supabase
      .from('tenants')
      .update({
        email: customer.email,
        name: customer.name,
      })
      .eq('stripe_customer_id', customer.id)

    console.log(`Customer ${customer.id} updated for tenant ${tenantId}`)
  } catch (error) {
    console.error(`Failed to update customer ${customer.id}:`, error)
    throw error
  }
}

/**
 * Handle customer.subscription.created event
 */
export async function handleSubscriptionCreated(event: WebhookEvent) {
  const subscription = event.data.object
  
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) {
    console.warn('Subscription created without tenant_id metadata')
    return
  }

  try {
    await syncSubscriptionToDatabase(subscription, tenantId)
    console.log(`Subscription ${subscription.id} synced for tenant ${tenantId}`)
  } catch (error) {
    console.error(`Failed to sync subscription ${subscription.id}:`, error)
    throw error
  }
}

/**
 * Handle customer.subscription.updated event
 */
export async function handleSubscriptionUpdated(event: WebhookEvent) {
  const subscription = event.data.object
  
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) {
    console.warn('Subscription updated without tenant_id metadata')
    return
  }

  try {
    await syncSubscriptionToDatabase(subscription, tenantId)
    console.log(`Subscription ${subscription.id} updated for tenant ${tenantId}`)
  } catch (error) {
    console.error(`Failed to update subscription ${subscription.id}:`, error)
    throw error
  }
}

/**
 * Handle customer.subscription.deleted event
 */
export async function handleSubscriptionDeleted(event: WebhookEvent) {
  const subscription = event.data.object
  
  const tenantId = subscription.metadata?.tenant_id
  if (!tenantId) {
    console.warn('Subscription deleted without tenant_id metadata')
    return
  }

  try {
    const supabase = await createClient()
    
    // Update tenant subscription status
    await supabase
      .from('tenants')
      .update({
        subscription_status: 'canceled',
        stripe_subscription_id: null,
      })
      .eq('id', tenantId)

    // Update subscription record
    await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('stripe_subscription_id', subscription.id)

    console.log(`Subscription ${subscription.id} canceled for tenant ${tenantId}`)
  } catch (error) {
    console.error(`Failed to cancel subscription ${subscription.id}:`, error)
    throw error
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
export async function handleInvoicePaymentSucceeded(event: WebhookEvent) {
  const invoice = event.data.object
  
  // Find tenant by customer ID
  const supabase = await createClient()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()

  if (tenantError) {
    console.error(`Failed to find tenant for customer ${invoice.customer}:`, tenantError)
    return
  }

  try {
    // Record payment in payment_history
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: tenant.id,
        stripe_invoice_id: invoice.id,
        amount_cents: invoice.amount_paid,
        status: 'succeeded',
        description: `Payment for ${invoice.period_start} - ${invoice.period_end}`,
        paid_at: new Date(invoice.status_transitions.paid_at * 1000).toISOString(),
      })

    console.log(`Payment recorded for tenant ${tenant.id}, invoice ${invoice.id}`)
  } catch (error) {
    console.error(`Failed to record payment for invoice ${invoice.id}:`, error)
    throw error
  }
}

/**
 * Handle invoice.payment_failed event
 */
export async function handleInvoicePaymentFailed(event: WebhookEvent) {
  const invoice = event.data.object
  
  // Find tenant by customer ID
  const supabase = await createClient()
  const { data: tenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single()

  if (tenantError) {
    console.error(`Failed to find tenant for customer ${invoice.customer}:`, tenantError)
    return
  }

  try {
    // Record failed payment
    await supabase
      .from('payment_history')
      .insert({
        tenant_id: tenant.id,
        stripe_invoice_id: invoice.id,
        amount_cents: invoice.amount_due,
        status: 'failed',
        description: `Failed payment for ${invoice.period_start} - ${invoice.period_end}`,
      })

    console.log(`Failed payment recorded for tenant ${tenant.id}, invoice ${invoice.id}`)
  } catch (error) {
    console.error(`Failed to record payment failure for invoice ${invoice.id}:`, error)
    throw error
  }
}

/**
 * Main webhook handler
 */
export async function handleWebhookEvent(event: WebhookEvent) {
  console.log(`Processing webhook event: ${event.type}`)

  switch (event.type) {
    case 'customer.created':
      await handleCustomerCreated(event)
      break
    
    case 'customer.updated':
      await handleCustomerUpdated(event)
      break
    
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event)
      break
    
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event)
      break
    
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event)
      break
    
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event)
      break
    
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event)
      break
    
    default:
      console.log(`Unhandled event type: ${event.type}`)
  }
}
