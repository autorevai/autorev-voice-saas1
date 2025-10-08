import { NextRequest, NextResponse } from 'next/server'
import { executeSmartCallRecovery, shouldRecoverCall, isSmartRecoveryEnabled } from '@/lib/automations/smart-call-recovery'

export const dynamic = 'force-dynamic'

/**
 * POST /api/automations/missed-call-rescue
 *
 * Trigger Smart Call Recovery for a specific call
 * Includes urgency detection and personalized multi-channel follow-up
 *
 * Body:
 * {
 *   tenantId: string
 *   callId: string
 *   customerPhone: string
 *   customerName?: string
 *   callDuration?: number
 *   outcome?: string
 *   hasBooking?: boolean
 *   transcript?: string
 *   summary?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      tenantId,
      callId,
      customerPhone,
      customerName,
      callDuration,
      outcome,
      hasBooking,
      transcript,
      summary
    } = body

    // Validate required fields
    if (!tenantId || !callId || !customerPhone) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, callId, customerPhone' },
        { status: 400 }
      )
    }

    console.log('📞 Smart Call Recovery request:', {
      tenantId,
      callId,
      customerPhone,
      outcome,
      duration: callDuration,
      hasTranscript: !!transcript,
      hasSummary: !!summary
    })

    // Check if tenant has recovery enabled
    const recoveryEnabled = await isSmartRecoveryEnabled(tenantId)
    if (!recoveryEnabled) {
      console.log('⏭️  Smart Call Recovery disabled for tenant')
      return NextResponse.json({
        success: false,
        message: 'Smart Call Recovery is disabled for this tenant'
      })
    }

    // Check if call qualifies for recovery
    const shouldRecover = shouldRecoverCall({
      outcome,
      durationSeconds: callDuration,
      hasBooking
    })

    if (!shouldRecover) {
      console.log('⏭️  Call does not qualify for recovery')
      return NextResponse.json({
        success: false,
        message: 'Call does not qualify for Smart Call Recovery',
        reason: hasBooking ? 'booking_created' : 'duration_too_long'
      })
    }

    // Execute Smart Call Recovery
    const result = await executeSmartCallRecovery({
      tenantId,
      callId,
      customerPhone,
      customerName,
      callDuration,
      outcome,
      transcript,
      summary
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        smsSent: result.smsSent,
        callbackScheduled: result.callbackScheduled,
        isUrgent: result.isUrgent,
        detectedIssue: result.detectedIssue,
        rescueId: result.rescueId
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to execute Smart Call Recovery' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Smart Call Recovery API error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
