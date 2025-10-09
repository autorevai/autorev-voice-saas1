// lib/vapi/outbound-calls.ts
// VAPI Outbound Call Scheduling

import { createClient } from '@/lib/supabase/client'

export interface ScheduleCallOptions {
  tenantId: string
  customerPhone: string
  customerName?: string
  delaySeconds: number // 30 for urgent, 300 for normal
  context?: {
    detectedIssue?: string
    isUrgent?: boolean
    originalCallId?: string
  }
}

export interface ScheduleCallResult {
  success: boolean
  callId?: string
  scheduledFor?: string
  error?: string
}

/**
 * Schedule an outbound callback via VAPI
 *
 * Uses VAPI's schedulePlan to schedule callback at specific time
 * Each tenant uses their own phone number and assistant
 */
export async function scheduleOutboundCallback(
  options: ScheduleCallOptions
): Promise<ScheduleCallResult> {
  const { tenantId, customerPhone, customerName, delaySeconds, context } = options

  console.log('📞 Scheduling outbound callback:', {
    tenantId,
    customerPhone,
    delaySeconds,
    isUrgent: context?.isUrgent
  })

  try {
    // 1. Get tenant's assistant and phone number
    const supabase = createClient()
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('vapi_assistant_id, vapi_number_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single()

    if (assistantError || !assistant) {
      console.error('❌ Failed to find active assistant:', assistantError)
      return {
        success: false,
        error: 'No active assistant found for tenant'
      }
    }

    if (!assistant.vapi_number_id) {
      console.error('❌ Assistant has no phone number configured')
      return {
        success: false,
        error: 'No phone number configured for tenant'
      }
    }

    // 2. Calculate scheduled time
    const scheduledTime = new Date(Date.now() + (delaySeconds * 1000))
    const scheduledTimeISO = scheduledTime.toISOString()

    console.log('⏰ Callback scheduled for:', {
      scheduledTime: scheduledTimeISO,
      delaySeconds,
      phoneNumberId: assistant.vapi_number_id,
      assistantId: assistant.vapi_assistant_id
    })

    // 3. Create VAPI outbound call with scheduling
    const vapiApiKey = process.env.VAPI_API_KEY
    if (!vapiApiKey) {
      console.error('❌ VAPI_API_KEY not configured')
      return {
        success: false,
        error: 'VAPI API key not configured'
      }
    }

    const callPayload = {
      phoneNumberId: assistant.vapi_number_id,
      assistantId: assistant.vapi_assistant_id,
      customer: {
        number: customerPhone,
        ...(customerName && { name: customerName })
      },
      // Schedule the call for future execution
      ...(delaySeconds > 0 && {
        schedulePlan: {
          earliestAt: scheduledTimeISO
        }
      })
    }

    console.log('📤 Sending VAPI outbound call request:', {
      phoneNumberId: assistant.vapi_number_id,
      customerPhone,
      scheduledFor: scheduledTimeISO
    })

    const response = await fetch('https://api.vapi.ai/call/phone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vapiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(callPayload)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ VAPI API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      return {
        success: false,
        error: `VAPI API error: ${response.status} ${errorText}`
      }
    }

    const result = await response.json()
    console.log('✅ VAPI outbound call scheduled:', {
      callId: result.id,
      scheduledFor: scheduledTimeISO
    })

    return {
      success: true,
      callId: result.id,
      scheduledFor: scheduledTimeISO
    }

  } catch (error: any) {
    console.error('❌ Failed to schedule outbound callback:', error)
    return {
      success: false,
      error: error?.message || 'Unknown error scheduling callback'
    }
  }
}

/**
 * Schedule immediate callback (for urgent cases)
 */
export async function scheduleUrgentCallback(
  tenantId: string,
  customerPhone: string,
  customerName?: string,
  detectedIssue?: string
): Promise<ScheduleCallResult> {
  return scheduleOutboundCallback({
    tenantId,
    customerPhone,
    customerName,
    delaySeconds: 30, // 30 seconds for urgent
    context: {
      isUrgent: true,
      detectedIssue
    }
  })
}

/**
 * Schedule normal callback (for non-urgent cases)
 */
export async function scheduleNormalCallback(
  tenantId: string,
  customerPhone: string,
  customerName?: string,
  detectedIssue?: string
): Promise<ScheduleCallResult> {
  return scheduleOutboundCallback({
    tenantId,
    customerPhone,
    customerName,
    delaySeconds: 300, // 5 minutes for normal
    context: {
      isUrgent: false,
      detectedIssue
    }
  })
}
