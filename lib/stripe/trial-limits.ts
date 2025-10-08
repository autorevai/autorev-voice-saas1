// Conservative trial limits: 10 calls OR 25 minutes (whichever comes first)
// This creates urgency while keeping CAC low ($0.75 vs $3.00)

export const TRIAL_LIMITS = {
  // Duration
  durationDays: 14,

  // Dual limits - BOTH are enforced
  minutesIncluded: 25,      // 25 minutes total OR
  callsIncluded: 10,        // 10 calls (whichever hits first)

  // Estimates
  minutesPerCallAverage: 2.5, // Used for UI estimates

  // Cost calculation
  costPerMinute: 0.03,        // $0.03/min
  estimatedCACPerTrial: 0.75, // 25 min × $0.03 = $0.75
} as const

// Helper to check if trial limit exceeded
export function isTrialLimitExceeded(minutesUsed: number, callsUsed: number): {
  exceeded: boolean
  limitType: 'minutes' | 'calls' | null
  message: string | null
} {
  const minutesExceeded = minutesUsed >= TRIAL_LIMITS.minutesIncluded
  const callsExceeded = callsUsed >= TRIAL_LIMITS.callsIncluded

  if (callsExceeded) {
    return {
      exceeded: true,
      limitType: 'calls',
      message: `You've used all ${TRIAL_LIMITS.callsIncluded} trial calls. Upgrade to continue receiving calls.`
    }
  }

  if (minutesExceeded) {
    return {
      exceeded: true,
      limitType: 'minutes',
      message: `You've used all ${TRIAL_LIMITS.minutesIncluded} trial minutes. Upgrade to continue receiving calls.`
    }
  }

  return {
    exceeded: false,
    limitType: null,
    message: null
  }
}

// Helper to get usage percentage (highest of the two limits)
export function getTrialUsagePercent(minutesUsed: number, callsUsed: number): {
  percent: number
  limitingFactor: 'minutes' | 'calls'
} {
  const minutesPercent = (minutesUsed / TRIAL_LIMITS.minutesIncluded) * 100
  const callsPercent = (callsUsed / TRIAL_LIMITS.callsIncluded) * 100

  return {
    percent: Math.max(minutesPercent, callsPercent),
    limitingFactor: minutesPercent > callsPercent ? 'minutes' : 'calls'
  }
}

// Helper to get remaining usage
export function getTrialRemaining(minutesUsed: number, callsUsed: number): {
  minutesRemaining: number
  callsRemaining: number
  closestToLimit: 'minutes' | 'calls'
} {
  const minutesRemaining = Math.max(0, TRIAL_LIMITS.minutesIncluded - minutesUsed)
  const callsRemaining = Math.max(0, TRIAL_LIMITS.callsIncluded - callsUsed)

  const { limitingFactor } = getTrialUsagePercent(minutesUsed, callsUsed)

  return {
    minutesRemaining,
    callsRemaining,
    closestToLimit: limitingFactor
  }
}
