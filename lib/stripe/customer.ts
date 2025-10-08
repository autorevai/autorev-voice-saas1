import { stripe, STRIPE_CONFIG } from './config'
import { createClient } from '../supabase/server'

export interface CreateCustomerData {
  email: string
  name: string
  tenantId: string
}

export interface UpdateCustomerData {
  email?: string
  name?: string
}

/**
 * Create a new Stripe customer
 */
export async function createStripeCustomer(data: CreateCustomerData) {
  const customer = await stripe.customers.create({
    email: data.email,
    name: data.name,
    metadata: {
      tenant_id: data.tenantId,
    },
  })

  return customer
}

/**
 * Update an existing Stripe customer
 */
export async function updateStripeCustomer(customerId: string, data: UpdateCustomerData) {
  const customer = await stripe.customers.update(customerId, {
    email: data.email,
    name: data.name,
  })

  return customer
}

/**
 * Get a Stripe customer by ID
 */
export async function getStripeCustomer(customerId: string) {
  const customer = await stripe.customers.retrieve(customerId)
  return customer
}

/**
 * Create or update customer in database
 */
export async function syncCustomerToDatabase(customerId: string, tenantId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('tenants')
    .update({ stripe_customer_id: customerId })
    .eq('id', tenantId)

  if (error) {
    throw new Error(`Failed to sync customer to database: ${error.message}`)
  }
}

/**
 * Get customer by tenant ID from database
 */
export async function getCustomerByTenantId(tenantId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('tenants')
    .select('stripe_customer_id, email, name')
    .eq('id', tenantId)
    .single()

  if (error) {
    throw new Error(`Failed to get customer: ${error.message}`)
  }

  return data
}
