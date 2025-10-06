// app/api/vapi/webhook/route.ts
// UNIVERSAL DYNAMIC HANDLER - Works with ANY VAPI assistant/number

import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateRequestId, createLogger } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

// ========================================
// DYNAMIC TENANT DETECTION
// ========================================
async function detectTenant(phoneNumber?: string, assistantId?: string, logger?: any): Promise<string | null> {
  const log = logger || console;
  const supabase = createClient();

  // Strategy 1: Find by assistant ID
  if (assistantId) {
    log.info?.('Looking up tenant by assistant ID', { assistantId }) ||
      console.log('Looking up tenant by assistant ID', { assistantId });

    const { data, error } = await supabase
      .from('assistants')
      .select('tenant_id')
      .eq('vapi_assistant_id', assistantId)
      .single();

    if (!error && data) {
      log.info?.('Found tenant by assistant ID', {
        assistantId,
        tenantId: data.tenant_id
      }) || console.log('Found tenant by assistant ID', { assistantId, tenantId: data.tenant_id });
      return data.tenant_id;
    }
  }

  // Strategy 2: Find by phone number
  if (phoneNumber) {
    log.info?.('Looking up tenant by phone number', { phoneNumber }) ||
      console.log('Looking up tenant by phone number', { phoneNumber });

    const { data, error } = await supabase
      .from('assistants')
      .select('tenant_id')
      .eq('vapi_number_id', phoneNumber)
      .single();

    if (!error && data) {
      log.info?.('Found tenant by phone number', {
        phoneNumber,
        tenantId: data.tenant_id
      }) || console.log('Found tenant by phone number', { phoneNumber, tenantId: data.tenant_id });
      return data.tenant_id;
    }
  }

  // Strategy 3: Use demo tenant as fallback
  const demoTenantId = process.env.DEMO_TENANT_ID;
  if (demoTenantId) {
    log.warn?.('Using demo tenant as fallback', { demoTenantId }) ||
      console.warn('Using demo tenant as fallback', { demoTenantId });
    return demoTenantId;
  }

  log.error?.('Could not determine tenant - no assistant, phone, or demo tenant') ||
    console.error('Could not determine tenant - no assistant, phone, or demo tenant');
  return null;
}

// ========================================
// DYNAMIC DATA EXTRACTION
// ========================================
function extractCallData(event: any): {
  callId: string | null;
  assistantId: string | null;
  phoneNumber: string | null;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  transcript: string | null;
  summary: string | null;
  endedReason: string | null;
  customer: {
    phone?: string;
    name?: string;
  };
} {
  // Handle multiple VAPI webhook formats
  const message = event?.message || event;
  const call = message?.call || event?.call || {};

  // Extract call metadata
  const callId = call?.id || message?.callId || event?.callId || null;
  const assistantId = call?.assistantId || message?.assistantId || event?.assistantId || null;

  // Extract phone numbers (try multiple fields)
  const phoneNumber =
    call?.phoneNumber?.number ||
    call?.phoneNumberId ||
    call?.customer?.number ||
    call?.customerNumber ||
    message?.phoneNumber ||
    null;

  // Extract customer info from call object
  const customerPhone =
    call?.customer?.number ||
    call?.customer?.phone ||
    call?.phoneNumber?.number ||
    null;

  const customerName =
    call?.customer?.name ||
    call?.customerName ||
    null;

  // Extract timestamps
  const startedAt = message?.startedAt || call?.startedAt || event?.startedAt || null;
  const endedAt = message?.endedAt || call?.endedAt || event?.endedAt || null;

  // Calculate duration
  let duration = null;
  if (message?.durationSeconds) {
    duration = Math.round(message.durationSeconds);
  } else if (startedAt && endedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    duration = Math.round((end - start) / 1000);
  }

  // Extract conversation data
  const transcript = message?.transcript || call?.transcript || null;
  const summary = message?.summary || call?.summary || null;
  const endedReason = message?.endedReason || call?.endedReason || null;

  return {
    callId,
    assistantId,
    phoneNumber,
    startedAt,
    endedAt,
    duration,
    transcript,
    summary,
    endedReason,
    customer: {
      phone: customerPhone,
      name: customerName
    }
  };
}

// ========================================
// MAIN HANDLER
// ========================================
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getOrCreateRequestId(req);
  const log = createLogger(requestId, 'VAPI_WEBHOOK');

  try {
    // Parse webhook
    const rawBody = await req.text();
    log.info('Received webhook', {
      bodyLength: rawBody.length,
      headers: Object.fromEntries(req.headers.entries())
    });

    const event = JSON.parse(rawBody);
    const message = event?.message || event;
    const messageType = message?.type || event?.type;

    log.info('Parsed webhook', {
      type: messageType,
      hasMessage: !!event?.message,
      topLevelKeys: Object.keys(event || {})
    });

    // Extract call data dynamically
    const callData = extractCallData(event);

    log.info('Extracted call data', {
      callId: callData.callId,
      assistantId: callData.assistantId,
      phoneNumber: callData.phoneNumber,
      hasTranscript: !!callData.transcript,
      duration: callData.duration
    });

    if (!callData.callId) {
      log.warn('No call ID found in webhook', { messageType, event });
      return NextResponse.json({ received: true, requestId }, { status: 200 });
    }

    // Detect tenant dynamically
    const supabase = createClient();
    const tenantId = await detectTenant(
      callData.phoneNumber || undefined,
      callData.assistantId || undefined,
      log
    );

    if (!tenantId) {
      log.error('Could not determine tenant for call', {
        callId: callData.callId,
        phoneNumber: callData.phoneNumber,
        assistantId: callData.assistantId
      });
      return NextResponse.json({
        error: 'Tenant not found',
        received: true,
        requestId
      }, { status: 200 });
    }

    log.info(`Processing ${messageType} for tenant ${tenantId}`, {
      callId: callData.callId,
      tenantId
    });

    // ========================================
    // HANDLE: assistant-request (Call Start)
    // ========================================
    if (messageType === 'assistant-request') {
      log.info('Handling assistant-request', {
        callId: callData.callId,
        tenantId
      });

      const { data: existingCall } = await supabase
        .from('calls')
        .select('id')
        .eq('vapi_call_id', callData.callId)
        .single();

      if (!existingCall) {
        // Look up assistant DB ID if we have VAPI assistant ID
        let assistantDbId = null;
        if (callData.assistantId) {
          const { data: assistant } = await supabase
            .from('assistants')
            .select('id')
            .eq('vapi_assistant_id', callData.assistantId)
            .single();
          assistantDbId = assistant?.id || null;
        }

        const { data: newCall, error: insertError } = await supabase
          .from('calls')
          .insert({
            tenant_id: tenantId,
            assistant_id: assistantDbId,
            vapi_call_id: callData.callId,
            started_at: callData.startedAt || new Date().toISOString(),
            outcome: 'unknown',
            raw_json: { event, callData }
          })
          .select()
          .single();

        if (insertError) {
          log.error('Failed to create call', {
            error: insertError.message,
            callId: callData.callId
          });
        } else {
          log.info('Call created successfully', {
            dbCallId: newCall.id,
            vapiCallId: callData.callId,
            tenantId
          });
        }
      } else {
        log.info('Call already exists', { callId: callData.callId });
      }

      const duration = Date.now() - startTime;
      return NextResponse.json({
        received: true,
        requestId,
        duration
      }, { status: 200 });
    }

    // ========================================
    // HANDLE: end-of-call-report (Call End)
    // ========================================
    if (messageType === 'end-of-call-report') {
      log.info('Handling end-of-call-report', {
        callId: callData.callId,
        duration: callData.duration,
        hasTranscript: !!callData.transcript,
        transcriptLength: callData.transcript?.length || 0
      });

      // Encode transcript as base64 data URL
      const transcriptUrl = callData.transcript
        ? `data:text/plain;base64,${Buffer.from(callData.transcript).toString('base64')}`
        : null;

      // Build minimal raw_json to avoid size limits
      const rawJson = {
        callId: callData.callId,
        assistantId: callData.assistantId,
        duration: callData.duration,
        endedReason: callData.endedReason,
        summary: callData.summary,
        // Don't include full transcript in raw_json (it's in transcript_url)
        hasTranscript: !!callData.transcript,
        transcriptLength: callData.transcript?.length || 0
      };

      const { data: updatedCall, error: updateError} = await supabase
        .from('calls')
        .update({
          ended_at: callData.endedAt || new Date().toISOString(),
          duration_sec: callData.duration,
          transcript_url: transcriptUrl,
          raw_json: rawJson
        })
        .eq('vapi_call_id', callData.callId)
        .select()
        .single();

      if (updateError) {
        log.error('Failed to update call', {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          callId: callData.callId
        });
      } else {
        log.info('Call updated successfully', {
          dbCallId: updatedCall.id,
          vapiCallId: callData.callId,
          duration: callData.duration
        });
      }

      const duration = Date.now() - startTime;
      return NextResponse.json({
        received: true,
        requestId,
        duration
      }, { status: 200 });
    }

    // ========================================
    // HANDLE: status-update
    // ========================================
    if (messageType === 'status-update') {
      log.info('Status update received', {
        callId: callData.callId,
        status: message?.status
      });

      const duration = Date.now() - startTime;
      return NextResponse.json({
        received: true,
        requestId,
        duration
      }, { status: 200 });
    }

    // ========================================
    // HANDLE: tool-calls (for logging)
    // ========================================
    if (messageType === 'tool-calls') {
      const toolNames = message?.toolCalls?.map((t: any) => t.function?.name) || [];

      log.info('Tool calls received', {
        callId: callData.callId,
        toolCount: message?.toolCalls?.length || 0,
        tools: toolNames
      });

      // Log each tool call for debugging
      if (message?.toolCalls) {
        for (const toolCall of message.toolCalls) {
          log.info('Tool call details', {
            name: toolCall.function?.name,
            args: toolCall.function?.arguments
          });
        }
      }

      const duration = Date.now() - startTime;
      return NextResponse.json({
        received: true,
        requestId,
        duration
      }, { status: 200 });
    }

    // ========================================
    // UNKNOWN TYPE
    // ========================================
    log.warn('Unknown webhook type', {
      type: messageType,
      callId: callData.callId,
      keys: Object.keys(message || {}),
      availableTypes: ['assistant-request', 'end-of-call-report', 'status-update', 'tool-calls']
    });

    const duration = Date.now() - startTime;
    return NextResponse.json({
      received: true,
      requestId,
      duration
    }, { status: 200 });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error('Webhook processing failed', {
      error: error.message,
      stack: error.stack,
      duration
    });

    return NextResponse.json({
      error: 'Webhook processing failed',
      message: error.message,
      received: true,
      requestId
    }, { status: 500 });
  }
}
