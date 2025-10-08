// lib/trial/config.ts
// Central configuration for trial limits and A/B testing

export type TrialBehavior = 'hard' | 'soft'

export interface TrialVariant {
  name: string
  description: string
  limits: {
    calls: number
    minutes: number
  }
  durationDays: number
  behavior: TrialBehavior
  // Allow waiting for auto-convert if limits hit?
  allowWaitForAutoConvert: boolean
}

export const TRIAL_VARIANTS: Record<string, TrialVariant> = {
  // Control group - current standard
  control: {
    name: 'Control (Standard)',
    description: '10 calls, 25 minutes, 14 days, hard limits',
    limits: {
      calls: 10,
      minutes: 25
    },
    durationDays: 14,
    behavior: 'hard',
    allowWaitForAutoConvert: true
  },

  // Test A: More generous limits
  generous: {
    name: 'Generous Trial',
    description: '20 calls, 50 minutes, 14 days, hard limits',
    limits: {
      calls: 20,
      minutes: 50
    },
    durationDays: 14,
    behavior: 'hard',
    allowWaitForAutoConvert: true
  },

  // Test B: Shorter trial
  short: {
    name: 'Short Trial',
    description: '10 calls, 25 minutes, 7 days, hard limits',
    limits: {
      calls: 10,
      minutes: 25
    },
    durationDays: 7,
    behavior: 'hard',
    allowWaitForAutoConvert: true
  },

  // Test C: Soft limits (for comparison)
  soft: {
    name: 'Soft Limits',
    description: '10 calls, 25 minutes, 14 days, soft limits (can continue)',
    limits: {
      calls: 10,
      minutes: 25
    },
    durationDays: 14,
    behavior: 'soft',
    allowWaitForAutoConvert: true
  },

  // Test D: Very generous
  veryGenerous: {
    name: 'Very Generous',
    description: '50 calls, 100 minutes, 21 days, hard limits',
    limits: {
      calls: 50,
      minutes: 100
    },
    durationDays: 21,
    behavior: 'hard',
    allowWaitForAutoConvert: true
  },

  // Test E: Strict (forces faster decision)
  strict: {
    name: 'Strict Trial',
    description: '5 calls, 15 minutes, 7 days, hard limits, no waiting',
    limits: {
      calls: 5,
      minutes: 15
    },
    durationDays: 7,
    behavior: 'hard',
    allowWaitForAutoConvert: false // Must upgrade, can't wait
  }
}

// Configuration for A/B test distribution
export const AB_TEST_CONFIG = {
  // Set to true to enable A/B testing
  enabled: false,

  // If disabled, everyone gets this variant
  defaultVariant: 'control' as keyof typeof TRIAL_VARIANTS,

  // Variant distribution (must add up to 100)
  distribution: {
    control: 50,      // 50% get control
    generous: 30,     // 30% get generous
    short: 20,        // 20% get short
    // soft: 0,       // 0% = disabled
    // veryGenerous: 0,
    // strict: 0
  }
}

/**
 * Get trial variant for a tenant
 * Uses consistent hashing so same tenant always gets same variant
 */
export function getTrialVariant(tenantId: string): TrialVariant {
  // If A/B testing disabled, return default
  if (!AB_TEST_CONFIG.enabled) {
    return TRIAL_VARIANTS[AB_TEST_CONFIG.defaultVariant]
  }

  // Use tenant ID to consistently assign variant
  const hash = hashString(tenantId)
  const bucket = hash % 100

  // Distribute based on configured percentages
  let cumulative = 0
  for (const [variantKey, percentage] of Object.entries(AB_TEST_CONFIG.distribution)) {
    cumulative += percentage
    if (bucket < cumulative) {
      return TRIAL_VARIANTS[variantKey as keyof typeof TRIAL_VARIANTS]
    }
  }

  // Fallback to control
  return TRIAL_VARIANTS.control
}

/**
 * Simple string hash function for consistent variant assignment
 */
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Check if trial limits have been exceeded
 */
export function checkTrialLimits(
  callsUsed: number,
  minutesUsed: number,
  variant: TrialVariant
): {
  limitsExceeded: boolean
  callsExceeded: boolean
  minutesExceeded: boolean
  callsRemaining: number
  minutesRemaining: number
} {
  const callsExceeded = callsUsed >= variant.limits.calls
  const minutesExceeded = minutesUsed >= variant.limits.minutes

  return {
    limitsExceeded: callsExceeded || minutesExceeded,
    callsExceeded,
    minutesExceeded,
    callsRemaining: Math.max(0, variant.limits.calls - callsUsed),
    minutesRemaining: Math.max(0, variant.limits.minutes - minutesUsed)
  }
}

/**
 * Get days remaining in trial
 */
export function getDaysRemaining(trialEndDate: Date): number {
  const now = new Date()
  const diff = trialEndDate.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Format trial status for display
 */
export function formatTrialStatus(
  callsUsed: number,
  minutesUsed: number,
  trialEndDate: Date,
  variant: TrialVariant
) {
  const limits = checkTrialLimits(callsUsed, minutesUsed, variant)
  const daysRemaining = getDaysRemaining(trialEndDate)

  return {
    ...limits,
    daysRemaining,
    trialEndDate,
    variant,
    isExpired: daysRemaining === 0,
    shouldBlock: limits.limitsExceeded && variant.behavior === 'hard'
  }
}
