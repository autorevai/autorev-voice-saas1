import { NextRequest, NextResponse } from "next/server"
import { createClient } from "../../../../lib/db"

// VAPI webhook event types
interface VapiWebhookEvent {
  type: 'assistant-request' | 'status-update' | 'end-of-call-report'
  call: {
    id: string
    status?: 'ringing' | 'in-progress' | 'forwarding' | 'ended'
    cost?: number
    startedAt?: string
    endedAt?: string
    customer?: {
      number: string
    }
    phoneNumber?: {
      number: string
    }
    messages?: Array<{
      type: string
      content?: string
    }>
    toolCalls?: Array<{
      toolName: string
      success: boolean
    }>
  }
  artifact?: {
    recordingUrl?: string
  }
}


// CORS headers
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,x-vapi-signature",
  }
}

function withCors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
    },
  })
}

// Handle assistant-request event (call starts)
async function handleAssistantRequest(event: VapiWebhookEvent) {
  const db = createClient()
  const tenantId = process.env.DEMO_TENANT_ID
  
  if (!tenantId) {
    console.warn("VAPI_WEBHOOK_WARN", { message: "No DEMO_TENANT_ID set, skipping call creation" })
    return
  }

  const callId = event.call.id
  const customerNumber = event.call.customer?.number || event.call.phoneNumber?.number || 'unknown'
  const startedAt = event.call.startedAt || new Date().toISOString()

  try {
    // Check if call already exists
    const { data: existingCall } = await db
      .from('calls')
      .select('id')
      .eq('vapi_call_id', callId)
      .single()

    if (existingCall) {
      console.info("VAPI_CALL_EXISTS", { callId, existingCallId: existingCall.id })
      return
    }

    // Create new call record
    const { data: newCall, error } = await db
      .from('calls')
      .insert({
        vapi_call_id: callId,
        tenant_id: tenantId,
        started_at: startedAt,
        raw_json: event
      })
      .select()
      .single()

    if (error) {
      console.error("VAPI_CALL_CREATE_ERROR", { error, callId })
      return
    }

    console.info("VAPI_CALL_CREATED", { 
      callId, 
      callDbId: newCall.id, 
      customerNumber,
      startedAt 
    })

  } catch (error) {
    console.error("VAPI_CALL_CREATE_EXCEPTION", { error, callId })
  }
}

// Handle status-update event
async function handleStatusUpdate(event: VapiWebhookEvent) {
  const db = createClient()
  const callId = event.call.id
  const status = event.call.status

  if (!status) {
    console.warn("VAPI_STATUS_UPDATE_NO_STATUS", { callId })
    return
  }

  try {
    // Find the call record
    const { data: call, error: findError } = await db
      .from('calls')
      .select('id, started_at')
      .eq('vapi_call_id', callId)
      .single()

    if (findError || !call) {
      console.warn("VAPI_STATUS_UPDATE_CALL_NOT_FOUND", { callId, error: findError })
      return
    }

    // Update call with status-specific data
    const updateData: any = {
      raw_json: event
    }

    if (status === 'ended') {
      const endedAt = event.call.endedAt || new Date().toISOString()
      updateData.ended_at = endedAt
      
      // Calculate duration if we have both start and end times
      if (call.started_at) {
        const startTime = new Date(call.started_at).getTime()
        const endTime = new Date(endedAt).getTime()
        updateData.duration_sec = Math.floor((endTime - startTime) / 1000)
      }
    }

    const { error: updateError } = await db
      .from('calls')
      .update(updateData)
      .eq('id', call.id)

    if (updateError) {
      console.error("VAPI_STATUS_UPDATE_ERROR", { error: updateError, callId })
    } else {
      console.info("VAPI_STATUS_UPDATED", { callId, status, callDbId: call.id })
    }

  } catch (error) {
    console.error("VAPI_STATUS_UPDATE_EXCEPTION", { error, callId })
  }
}

// Handle end-of-call-report event
async function handleEndOfCallReport(event: VapiWebhookEvent) {
  const db = createClient()
  const callId = event.call.id

  try {
    // Find the call record
    const { data: call, error: findError } = await db
      .from('calls')
      .select('id, started_at, raw_json')
      .eq('vapi_call_id', callId)
      .single()

    if (findError || !call) {
      console.warn("VAPI_END_REPORT_CALL_NOT_FOUND", { callId, error: findError })
      return
    }

    // Determine outcome from tool calls
    let outcome = 'unknown'
    if (event.call.toolCalls && event.call.toolCalls.length > 0) {
      const successfulBookings = event.call.toolCalls.filter(
        tc => tc.toolName === 'create_booking' && tc.success
      )
      const successfulHandoffs = event.call.toolCalls.filter(
        tc => tc.toolName === 'handoff_sms' && tc.success
      )
      
      if (successfulBookings.length > 0) {
        outcome = 'booked'
      } else if (successfulHandoffs.length > 0) {
        outcome = 'handoff'
      } else {
        outcome = 'completed'
      }
    }

    // Prepare update data
    const updateData: any = {
      ended_at: event.call.endedAt || new Date().toISOString(),
      outcome: outcome,
      raw_json: event
    }

    // Add cost if available
    if (event.call.cost !== undefined) {
      updateData.cost_cents = Math.round(event.call.cost * 100) // Convert to cents
    }

    // Add transcript URL if available
    if (event.artifact?.recordingUrl) {
      updateData.transcript_url = event.artifact.recordingUrl
    }

    // Calculate duration
    if (call.started_at) {
      const startTime = new Date(call.started_at).getTime()
      const endTime = new Date(updateData.ended_at).getTime()
      updateData.duration_sec = Math.floor((endTime - startTime) / 1000)
    }

    // Update the call record
    const { error: updateError } = await db
      .from('calls')
      .update(updateData)
      .eq('id', call.id)

    if (updateError) {
      console.error("VAPI_END_REPORT_UPDATE_ERROR", { error: updateError, callId })
    } else {
      console.info("VAPI_END_REPORT_UPDATED", { 
        callId, 
        callDbId: call.id, 
        outcome,
        durationSec: updateData.duration_sec,
        costCents: updateData.cost_cents
      })
    }

  } catch (error) {
    console.error("VAPI_END_REPORT_EXCEPTION", { error, callId })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

export async function POST(req: NextRequest) {
  try {
    // Verify shared secret (same as /api/tools)
    const webhookSecret = process.env.WEBHOOK_SHARED_SECRET
    if (!webhookSecret) {
      console.error("VAPI_WEBHOOK_NO_SECRET")
      return withCors({ error: 'Webhook secret not configured' }, 500)
    }

    const providedSecret = req.headers.get('x-shared-secret')
    if (providedSecret !== webhookSecret) {
      console.warn("VAPI_WEBHOOK_UNAUTHORIZED")
      return withCors({ error: 'Unauthorized' }, 401)
    }

    // Parse the webhook event
    let event: VapiWebhookEvent
    try {
      event = await req.json()
    } catch (error) {
      console.error("VAPI_WEBHOOK_INVALID_JSON", { error })
      return withCors({ error: 'Invalid JSON' }, 400)
    }

    // Log the event for debugging
    console.info("VAPI_WEBHOOK_EVENT", { 
      type: event.type, 
      callId: event.call?.id,
      status: event.call?.status 
    })

    // Route to appropriate handler
    switch (event.type) {
      case 'assistant-request':
        await handleAssistantRequest(event)
        break
      
      case 'status-update':
        await handleStatusUpdate(event)
        break
      
      case 'end-of-call-report':
        await handleEndOfCallReport(event)
        break
      
      default:
        console.warn("VAPI_WEBHOOK_UNKNOWN_EVENT", { type: event.type })
    }

    // VAPI expects an empty object response
    return withCors({})

  } catch (error) {
    console.error("VAPI_WEBHOOK_EXCEPTION", { error })
    return withCors({ error: 'Internal server error' }, 500)
  }
}