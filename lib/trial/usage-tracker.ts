// lib/trial/usage-tracker.ts
// Service for tracking and enforcing trial limits

import { createClient } from '@/lib/db'
import { getTrialVariant, checkTrialLimits, getDaysRemaining } from './config'

export interface TrialStatus {
  isInTrial: boolean
  isBlocked: boolean
  callsUsed: number
  minutesUsed: number
  callsRemaining: number
  minutesRemaining: number
  daysRemaining: number
  variant: string
  shouldBlock: boolean
  limitsExceeded: boolean
}

/**
 * Track usage after a call completes
 */
export async function trackCallUsage(
  tenantId: string,
  callId: string,
  durationSeconds: number
): Promise<{ blocked: boolean; status: TrialStatus }> {
  const supabase = createClient()

  console.log(`[TRIAL] Tracking usage for tenant ${tenantId}, call ${callId}, duration ${durationSeconds}s`)

  // Get tenant info
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('trial_calls_used, trial_minutes_used, trial_variant, stripe_subscription_status, stripe_trial_end, trial_blocked')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    console.error('[TRIAL] Failed to fetch tenant:', error)
    throw new Error('Tenant not found')
  }

  // Only track if in trial
  if (tenant.stripe_subscription_status !== 'trialing') {
    console.log('[TRIAL] Not in trial, skipping usage tracking')
    return {
      blocked: false,
      status: {
        isInTrial: false,
        isBlocked: false,
        callsUsed: 0,
        minutesUsed: 0,
        callsRemaining: 999,
        minutesRemaining: 999,
        daysRemaining: 0,
        variant: tenant.trial_variant || 'control',
        shouldBlock: false,
        limitsExceeded: false
      }
    }
  }

  // Increment usage using database function
  const durationMinutes = durationSeconds / 60
  await supabase.rpc('increment_trial_usage', {
    p_tenant_id: tenantId,
    p_duration_minutes: durationMinutes
  })

  // Get updated counts
  const newCallsUsed = tenant.trial_calls_used + 1
  const newMinutesUsed = tenant.trial_minutes_used + durationMinutes

  // Check if limits exceeded
  const variant = getTrialVariant(tenant.trial_variant || tenantId)
  const limits = checkTrialLimits(newCallsUsed, newMinutesUsed, variant)

  console.log(`[TRIAL] Usage: ${newCallsUsed}/${variant.limits.calls} calls, ${newMinutesUsed.toFixed(1)}/${variant.limits.minutes} minutes`)

  // If limits exceeded and hard behavior, block the trial
  if (limits.limitsExceeded && variant.behavior === 'hard' && !tenant.trial_blocked) {
    console.log('[TRIAL] Limits exceeded! Blocking trial.')

    await supabase.rpc('block_trial', {
      p_tenant_id: tenantId
    })

    // Send notification email
    await sendTrialLimitEmail(tenantId, variant)

    return {
      blocked: true,
      status: {
        isInTrial: true,
        isBlocked: true,
        callsUsed: newCallsUsed,
        minutesUsed: newMinutesUsed,
        callsRemaining: 0,
        minutesRemaining: 0,
        daysRemaining: getDaysRemaining(new Date(tenant.stripe_trial_end)),
        variant: tenant.trial_variant || 'control',
        shouldBlock: true,
        limitsExceeded: true
      }
    }
  }

  return {
    blocked: false,
    status: {
      isInTrial: true,
      isBlocked: false,
      callsUsed: newCallsUsed,
      minutesUsed: newMinutesUsed,
      callsRemaining: limits.callsRemaining,
      minutesRemaining: limits.minutesRemaining,
      daysRemaining: getDaysRemaining(new Date(tenant.stripe_trial_end)),
      variant: tenant.trial_variant || 'control',
      shouldBlock: false,
      limitsExceeded: limits.limitsExceeded
    }
  }
}

/**
 * Check if tenant is allowed to make calls
 */
export async function canMakeCall(tenantId: string): Promise<{
  allowed: boolean
  reason?: string
  status: TrialStatus
}> {
  const supabase = createClient()

  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('trial_calls_used, trial_minutes_used, trial_variant, trial_blocked, stripe_subscription_status, stripe_trial_end')
    .eq('id', tenantId)
    .single()

  if (error || !tenant) {
    return {
      allowed: false,
      reason: 'Tenant not found',
      status: {} as TrialStatus
    }
  }

  // If not in trial, allow
  if (tenant.stripe_subscription_status !== 'trialing') {
    return {
      allowed: true,
      status: {
        isInTrial: false,
        isBlocked: false,
        callsUsed: 0,
        minutesUsed: 0,
        callsRemaining: 999,
        minutesRemaining: 999,
        daysRemaining: 0,
        variant: tenant.trial_variant || 'control',
        shouldBlock: false,
        limitsExceeded: false
      }
    }
  }

  // If trial is blocked, deny
  if (tenant.trial_blocked) {
    const variant = getTrialVariant(tenant.trial_variant || tenantId)
    return {
      allowed: false,
      reason: 'Trial limit reached. Please upgrade to continue.',
      status: {
        isInTrial: true,
        isBlocked: true,
        callsUsed: tenant.trial_calls_used,
        minutesUsed: tenant.trial_minutes_used,
        callsRemaining: 0,
        minutesRemaining: 0,
        daysRemaining: getDaysRemaining(new Date(tenant.stripe_trial_end)),
        variant: tenant.trial_variant || 'control',
        shouldBlock: true,
        limitsExceeded: true
      }
    }
  }

  // Check if trial expired
  const trialEnd = new Date(tenant.stripe_trial_end)
  if (new Date() > trialEnd) {
    return {
      allowed: false,
      reason: 'Trial period expired. Please subscribe to continue.',
      status: {
        isInTrial: true,
        isBlocked: true,
        callsUsed: tenant.trial_calls_used,
        minutesUsed: tenant.trial_minutes_used,
        callsRemaining: 0,
        minutesRemaining: 0,
        daysRemaining: 0,
        variant: tenant.trial_variant || 'control',
        shouldBlock: true,
        limitsExceeded: true
      }
    }
  }

  // All checks passed
  const variant = getTrialVariant(tenant.trial_variant || tenantId)
  const limits = checkTrialLimits(
    tenant.trial_calls_used,
    tenant.trial_minutes_used,
    variant
  )

  return {
    allowed: true,
    status: {
      isInTrial: true,
      isBlocked: false,
      callsUsed: tenant.trial_calls_used,
      minutesUsed: tenant.trial_minutes_used,
      callsRemaining: limits.callsRemaining,
      minutesRemaining: limits.minutesRemaining,
      daysRemaining: getDaysRemaining(trialEnd),
      variant: tenant.trial_variant || 'control',
      shouldBlock: false,
      limitsExceeded: false
    }
  }
}

/**
 * Get current trial status for display
 */
export async function getTrialStatus(tenantId: string): Promise<TrialStatus> {
  const result = await canMakeCall(tenantId)
  return result.status
}

/**
 * Send email when trial limit is hit
 */
async function sendTrialLimitEmail(tenantId: string, variant: any) {
  // TODO: Implement email sending
  console.log(`[TRIAL] Would send trial limit email to tenant ${tenantId}`)
  console.log(`[TRIAL] Variant: ${variant.name}, Limits: ${variant.limits.calls} calls, ${variant.limits.minutes} minutes`)

  // Integration with your email service:
  // await sendEmail({
  //   to: tenant.email,
  //   subject: "You've hit your trial limit! 🎉",
  //   template: 'trial-limit-reached',
  //   data: { tenantId, variant }
  // })
}
