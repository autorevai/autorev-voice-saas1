import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

// Stripe configuration constants
export const STRIPE_CONFIG = {
  // Plan tiers and their pricing
  plans: {
    starter: {
      name: 'Starter',
      priceId: process.env.STRIPE_STARTER_PRICE_ID,
      minutesIncluded: 500,
      overageRatePerMinute: 0.15, // $0.15 per minute
    },
    growth: {
      name: 'Growth', 
      priceId: process.env.STRIPE_GROWTH_PRICE_ID,
      minutesIncluded: 1500,
      overageRatePerMinute: 0.15, // $0.15 per minute
    },
    pro: {
      name: 'Pro',
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      minutesIncluded: 5000,
      overageRatePerMinute: 0.15, // $0.15 per minute
    },
  },
  
  // Trial configuration
  trial: {
    durationDays: 14,
  },
  
  // Webhook configuration
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Currency
  currency: 'usd',
} as const

export type PlanTier = keyof typeof STRIPE_CONFIG.plans