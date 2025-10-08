// app/api/vapi/webhook/trial-check.ts
// Add this to your existing VAPI webhook to enforce trial limits

import { canMakeCall, trackCallUsage } from '@/lib/trial/usage-tracker'
import { createClient } from '@/lib/db'

/**
 * Check if call should be allowed before it starts
 * Call this in your assistant-request handler
 */
export async function checkTrialBeforeCall(tenantId: string): Promise<{
  allowed: boolean
  message?: string
}> {
  const result = await canMakeCall(tenantId)

  if (!result.allowed) {
    console.log(`[TRIAL] Call blocked for tenant ${tenantId}: ${result.reason}`)

    // Return custom message for VAPI
    return {
      allowed: false,
      message: result.reason || 'Service temporarily unavailable'
    }
  }

  console.log(`[TRIAL] Call allowed for tenant ${tenantId}`)
  return { allowed: true }
}

/**
 * Track usage after call ends
 * Call this in your end-of-call-report handler
 */
export async function handleCallEnded(
  tenantId: string,
  callId: string,
  durationSeconds: number
) {
  console.log(`[TRIAL] Call ended: ${callId}, duration: ${durationSeconds}s`)

  try {
    const result = await trackCallUsage(tenantId, callId, durationSeconds)

    if (result.blocked) {
      console.log(`[TRIAL] Trial blocked for tenant ${tenantId} after this call`)

      // Optionally update VAPI assistant to show blocked message
      await updateVAPIAssistantForBlockedTrial(tenantId)
    }

    return result
  } catch (error) {
    console.error('[TRIAL] Error tracking call usage:', error)
    // Don't block call if tracking fails
    return { blocked: false, status: {} as any }
  }
}

/**
 * Update VAPI assistant's first message when trial is blocked
 */
async function updateVAPIAssistantForBlockedTrial(tenantId: string) {
  const supabase = createClient()

  // Get assistant ID
  const { data: assistant } = await supabase
    .from('assistants')
    .select('vapi_assistant_id')
    .eq('tenant_id', tenantId)
    .single()

  if (!assistant) return

  // TODO: Update VAPI assistant
  console.log(`[TRIAL] Would update VAPI assistant ${assistant.vapi_assistant_id} with blocked message`)

  // Optional: Update assistant's first message
  // const vapi = new VapiClient({ apiKey: process.env.VAPI_API_KEY! })
  // await vapi.assistants.update(assistant.vapi_assistant_id, {
  //   firstMessage: "Thank you for calling. Your trial period has reached its limit. Please visit your dashboard to upgrade your subscription."
  // })
}
