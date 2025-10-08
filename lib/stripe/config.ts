// lib/stripe/config.ts
// Updated pricing: Starter $299, Growth $699, Pro $1,499
// SMS basics included in Starter tier

import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not set in environment variables')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-09-30.clover',
  typescript: true,
})

export const STRIPE_CONFIG = {
  plans: {
    starter: {
      name: 'Starter',
      priceId: process.env.STRIPE_STARTER_PRICE_ID,
      price: 299,
      trialDays: 14,
      trialLimits: {
        calls: 10,
        minutes: 25
      },
      minutesIncluded: 300,
      overageRatePerMinute: 0.20, // $0.20 per minute
      features: [
        '300 minutes per month',
        '1 Phone Number',
        '24/7 AI Receptionist',
        'Appointment Booking',
        'SMS Basics (confirmations & missed call follow-up)',
        'Call Recording & Transcripts',
        'Email Notifications',
        'Basic Analytics',
        'Email Support'
      ],
      smsFeatures: {
        appointmentConfirmations: true,
        missedCallFollowUp: true,
        basicTemplates: 3,
        customTemplates: false,
        automatedReminders: false,
        twoWayConversations: false
      }
    },

    growth: {
      name: 'Growth',
      priceId: process.env.STRIPE_GROWTH_PRICE_ID,
      price: 699,
      trialDays: 14,
      trialLimits: {
        calls: 10,
        minutes: 25
      },
      minutesIncluded: 1000,
      overageRatePerMinute: 0.18, // $0.18 per minute
      features: [
        '1,000 minutes per month',
        '3 Phone Numbers',
        'Everything in Starter',
        'Smart Call Recovery (Advanced SMS)',
        'Pre/Post Appointment Reminders',
        'Custom SMS Templates',
        'SMS Conversation Tracking',
        'Priority Support (<4hr response)',
        'Advanced Analytics & AI Insights',
        'Custom Voice Configuration',
        'Call Transfer Rules',
        'Basic CRM Integrations (Zapier)'
      ],
      smsFeatures: {
        appointmentConfirmations: true,
        missedCallFollowUp: true,
        basicTemplates: 10,
        customTemplates: true,
        automatedReminders: true,
        twoWayConversations: true,
        smartFollowUp: true
      }
    },

    pro: {
      name: 'Pro',
      priceId: process.env.STRIPE_PRO_PRICE_ID,
      price: 1499,
      trialDays: 14,
      trialLimits: {
        calls: 10,
        minutes: 25
      },
      minutesIncluded: 3000,
      overageRatePerMinute: 0.15, // $0.15 per minute
      features: [
        '3,000 minutes per month',
        'Unlimited Phone Numbers',
        'Everything in Growth',
        'Dedicated Account Manager',
        'White-label Options',
        'API Access (Custom Integrations)',
        'Advanced CRM Integrations (Salesforce, HubSpot, ServiceTitan)',
        'Multi-location Support',
        '24/7 Phone Support',
        '99.9% Uptime SLA',
        'Custom Training Sessions',
        'Priority Feature Requests'
      ],
      smsFeatures: {
        appointmentConfirmations: true,
        missedCallFollowUp: true,
        basicTemplates: 999,
        customTemplates: true,
        automatedReminders: true,
        twoWayConversations: true,
        smartFollowUp: true,
        customWorkflows: true,
        apiAccess: true
      }
    }
  },

  // Webhook configuration
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Currency
  currency: 'usd',
} as const

export type PlanTier = keyof typeof STRIPE_CONFIG.plans

// Helper to get plan by key
export function getPlan(planKey: 'starter' | 'growth' | 'pro') {
  return STRIPE_CONFIG.plans[planKey]
}

// Helper to format price
export function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

// Helper to check if feature is available in plan
export function hasSMSFeature(
  planKey: 'starter' | 'growth' | 'pro',
  feature: keyof typeof STRIPE_CONFIG.plans.starter.smsFeatures
): boolean {
  const value = STRIPE_CONFIG.plans[planKey].smsFeatures[feature]
  return typeof value === 'boolean' ? value : !!value
}
