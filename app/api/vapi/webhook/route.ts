// app/api/vapi/webhook/route.ts
// UNIVERSAL DYNAMIC HANDLER - Works with ANY VAPI assistant/number

import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getOrCreateRequestId, createLogger } from '@/lib/request-id';

export const dynamic = 'force-dynamic';

// ========================================
// WEBHOOK AUTHENTICATION
// ========================================
function verifyVapiWebhook(req: NextRequest): boolean {
  // VAPI sends secret in x-vapi-secret header or Authorization header
  const vapiSecret = req.headers.get('x-vapi-secret');
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Also check for x-shared-secret (our custom header)
  const sharedSecret = req.headers.get('x-shared-secret');

  const providedSecret = vapiSecret || bearerToken || sharedSecret;
  const expectedSecret = process.env.WEBHOOK_SHARED_SECRET;

  if (!expectedSecret) {
    console.warn('⚠️ WEBHOOK_SHARED_SECRET not configured - authentication disabled!');
    return true; // Allow in dev, but warn
  }

  if (!providedSecret) {
    console.error('❌ No authentication header provided');
    return false;
  }

  return providedSecret === expectedSecret;
}

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
  cost: number | null;
  analysis: {
    successEvaluation?: string;
  };
  customer: {
    phone?: string;
    name?: string;
  };
} {
  // Handle multiple VAPI webhook formats
  const message = event?.message || event;
  const call = message?.call || event?.call || {};
  const artifact = message?.artifact || event?.artifact || {};

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
    event?.phoneNumber?.number ||
    null;

  // Extract customer info from call object
  const customerPhone =
    call?.customer?.number ||
    call?.customer?.phone ||
    call?.phoneNumber?.number ||
    event?.customer?.number ||
    null;

  const customerName =
    call?.customer?.name ||
    call?.customerName ||
    event?.customer?.name ||
    null;

  // Extract timestamps
  const startedAt = message?.startedAt || call?.startedAt || call?.createdAt || event?.startedAt || null;
  const endedAt = message?.endedAt || call?.endedAt || event?.endedAt || null;

  // Calculate duration
  let duration = null;
  if (message?.durationSeconds) {
    duration = Math.round(message.durationSeconds);
  } else if (call?.duration) {
    duration = Math.round(call.duration);
  } else if (startedAt && endedAt) {
    const start = new Date(startedAt).getTime();
    const end = new Date(endedAt).getTime();
    duration = Math.round((end - start) / 1000);
  }

  // Extract conversation data - try multiple locations
  let transcript = null;
  if (message?.transcript) {
    transcript = message.transcript;
  } else if (artifact?.transcript) {
    transcript = artifact.transcript;
  } else if (artifact?.messages) {
    // Build transcript from messages array
    const messages = artifact.messages
      .filter((m: any) => m.role === 'user' || m.role === 'bot' || m.role === 'assistant')
      .map((m: any) => `${m.role === 'user' ? 'Customer' : 'Assistant'}: ${m.message || m.content || ''}`)
      .join('\n\n');
    if (messages) transcript = messages;
  }

  const summary = message?.summary || artifact?.summary || call?.summary || null;
  const endedReason = message?.endedReason || call?.endedReason || event?.endedReason || null;

  // Extract cost and analysis
  const cost = call?.cost || message?.cost || 0;
  const analysis = {
    successEvaluation: artifact?.successEvaluation || message?.analysis?.successEvaluation || null
  };

  console.log('🔍 EXTRACTED DATA:', {
    has_transcript: !!transcript,
    transcript_length: transcript?.length || 0,
    has_summary: !!summary,
    duration,
    ended_reason: endedReason,
    cost,
    customer_phone: customerPhone
  });

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
    cost,
    analysis,
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

  // ========================================
  // 1. AUTHENTICATE WEBHOOK
  // ========================================
  if (!verifyVapiWebhook(req)) {
    console.error('❌ UNAUTHORIZED VAPI WEBHOOK');
    log.error('Webhook authentication failed', {
      headers: Object.fromEntries(req.headers.entries())
    });
    return NextResponse.json({
      error: 'Unauthorized',
      requestId
    }, { status: 401 });
  }

  try {
    // ========================================
    // 2. PARSE WEBHOOK PAYLOAD
    // ========================================
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // VAPI always sends: { message: { type, call, ... } }
    if (!payload.message || !payload.message.type) {
      console.error('❌ INVALID WEBHOOK PAYLOAD:', {
        has_message: !!payload.message,
        has_type: !!payload.message?.type,
        top_level_keys: Object.keys(payload)
      });
      log.error('Invalid VAPI webhook payload structure', {
        payload,
        expected: '{ message: { type, call } }'
      });
      return NextResponse.json({
        error: 'Invalid payload - expected { message: { type, call } }',
        requestId
      }, { status: 400 });
    }

    const message = payload.message;
    const messageType = message.type;

    console.log('📥 WEBHOOK RECEIVED:', messageType);
    log.info('Received webhook', {
      bodyLength: rawBody.length,
      type: messageType,
      hasCall: !!message.call
    });

    // ========================================
    // 3. EXTRACT CALL DATA
    // ========================================
    const callData = extractCallData(payload);

    console.log('🔍 CALL DATA:', {
      call_id: callData.callId?.substring(0, 12) + '...',
      type: messageType,
      duration: callData.duration || 'n/a',
      has_transcript: !!callData.transcript
    });

    log.info('Extracted call data', {
      callId: callData.callId,
      assistantId: callData.assistantId,
      phoneNumber: callData.phoneNumber,
      hasTranscript: !!callData.transcript,
      duration: callData.duration
    });

    if (!callData.callId) {
      log.warn('No call ID found in webhook', { messageType, payload });
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
      console.error('❌ TENANT NOT FOUND:', {
        call_id: callData.callId,
        assistant: callData.assistantId,
        phone: callData.phoneNumber
      });
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

    console.log('🏢 TENANT DETECTED:', tenantId.substring(0, 8) + '...');
    log.info(`Processing ${messageType} for tenant ${tenantId}`, {
      callId: callData.callId,
      tenantId
    });

    // ========================================
    // HANDLE: assistant-request (Call Start)
    // ========================================
    if (messageType === 'assistant-request') {
      console.log('📞 CALL STARTING...');
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
            raw_json: {
              call_id: callData.callId,
              assistant_id: callData.assistantId,
              phone_number: callData.phoneNumber,
              customer: {
                phone: callData.customer.phone,
                name: callData.customer.name
              },
              started_at: callData.startedAt,
              status: 'started'
            }
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ DB CALL INSERT FAILED:', insertError.message);
          log.error('Failed to create call', {
            error: insertError.message,
            callId: callData.callId
          });
        } else {
          console.log('✅ DB CALL CREATED:', {
            id: newCall.id,
            tenant: tenantId,
            call_id: callData.callId
          });
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
      console.log('📴 CALL ENDED:', {
        duration: callData.duration + 's',
        transcript: callData.transcript ? callData.transcript.length + ' chars' : 'none'
      });
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

      // Build clean metadata for raw_json (keep it under 1MB)
      const rawJson = {
        call_id: callData.callId,
        assistant_id: callData.assistantId,
        duration_sec: callData.duration,
        ended_reason: callData.endedReason,
        summary: callData.summary,
        cost: callData.cost,
        success_evaluation: callData.analysis.successEvaluation,
        customer: {
          phone: callData.customer.phone,
          name: callData.customer.name
        },
        transcript: {
          has_transcript: !!callData.transcript,
          length: callData.transcript?.length || 0,
          stored_in: 'transcript_url'
        },
        timestamps: {
          started_at: callData.startedAt,
          ended_at: callData.endedAt
        }
      };

      // ========================================
      // IDEMPOTENCY: Check if already processed
      // ========================================
      const { data: existingCall } = await supabase
        .from('calls')
        .select('id, ended_at')
        .eq('vapi_call_id', callData.callId)
        .single();

      // If call already has ended_at, this is a retry - skip processing
      if (existingCall?.ended_at) {
        console.log('✅ CALL ALREADY PROCESSED (retry detected):', {
          call_id: callData.callId,
          db_id: existingCall.id
        });
        log.info('Call already processed - idempotent retry detected', {
          callId: callData.callId,
          dbId: existingCall.id,
          existingEndedAt: existingCall.ended_at
        });
        return NextResponse.json({
          received: true,
          status: 'already_processed',
          requestId
        }, { status: 200 });
      }

      if (!existingCall) {
        log.warn('Call record does not exist - creating now (assistant-request may have been missed)', {
          callId: callData.callId
        });

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

        // Create the call record with all end-of-call data
        const { data: newCall, error: insertError } = await supabase
          .from('calls')
          .insert({
            tenant_id: tenantId,
            assistant_id: assistantDbId,
            vapi_call_id: callData.callId,
            started_at: callData.startedAt || new Date(Date.now() - (callData.duration || 0) * 1000).toISOString(),
            ended_at: callData.endedAt || new Date().toISOString(),
            duration_sec: callData.duration,
            transcript_url: transcriptUrl,
            outcome: 'unknown',
            raw_json: rawJson
          })
          .select()
          .single();

        if (insertError) {
          console.error('❌ DB CALL INSERT FAILED (end-of-call):', insertError.message);
          log.error('Failed to create call during end-of-call-report', {
            error: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
            callId: callData.callId
          });
        } else {
          console.log('✅ DB CALL CREATED (end-of-call):', {
            id: newCall.id,
            tenant: tenantId,
            duration: callData.duration,
            has_transcript: !!callData.transcript
          });
          log.info('Call created successfully from end-of-call-report', {
            dbCallId: newCall.id,
            vapiCallId: callData.callId,
            tenantId
          });
        }

        const duration = Date.now() - startTime;
        return NextResponse.json({
          received: true,
          created: true,
          requestId,
          duration
        }, { status: 200 });
      }

      // Call exists - update it with end-of-call data
      const { data: updatedCall, error: updateError} = await supabase
        .from('calls')
        .update({
          ended_at: callData.endedAt || new Date().toISOString(),
          duration_sec: callData.duration,
          transcript_url: transcriptUrl,
          outcome: 'unknown',
          raw_json: rawJson
        })
        .eq('vapi_call_id', callData.callId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ DB CALL UPDATE FAILED:', updateError.message);
        log.error('Failed to update call', {
          error: updateError.message,
          code: updateError.code,
          details: updateError.details,
          hint: updateError.hint,
          callId: callData.callId
        });
      } else {
        console.log('✅ DB CALL UPDATED:', {
          id: updatedCall.id,
          duration: callData.duration,
          transcript_length: callData.transcript?.length || 0
        });
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

      console.log('🔧 TOOL CALLS:', toolNames.join(', '));
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
    // HANDLE: hang (Call hung up before end-of-call-report)
    // ========================================
    if (messageType === 'hang') {
      console.log('📴 CALL HUNG UP:', {
        call_id: callData.callId?.substring(0, 12) + '...'
      });
      log.info('Call hung up', {
        callId: callData.callId,
        reason: message?.reason
      });

      // Update call record if it exists
      const { data: existingCall } = await supabase
        .from('calls')
        .select('id, ended_at')
        .eq('vapi_call_id', callData.callId)
        .single();

      if (existingCall && !existingCall.ended_at) {
        await supabase
          .from('calls')
          .update({
            ended_at: new Date().toISOString(),
            outcome: 'abandoned',
            raw_json: { hang_reason: message?.reason }
          })
          .eq('vapi_call_id', callData.callId);

        console.log('✅ DB CALL UPDATED (hung up)');
      }

      const duration = Date.now() - startTime;
      return NextResponse.json({
        received: true,
        requestId,
        duration
      }, { status: 200 });
    }

    // ========================================
    // HANDLE: Informational events (conversation-update, transcript, speech-update)
    // ========================================
    if (['conversation-update', 'transcript', 'speech-update', 'model-output', 'user-interrupted'].includes(messageType)) {
      log.info('Informational event received', {
        type: messageType,
        callId: callData.callId
      });

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
    console.warn('⚠️ UNKNOWN WEBHOOK TYPE:', messageType);
    log.warn('Unknown webhook type', {
      type: messageType,
      callId: callData.callId,
      keys: Object.keys(message || {}),
      handledTypes: ['assistant-request', 'end-of-call-report', 'status-update', 'tool-calls', 'hang', 'conversation-update', 'transcript', 'speech-update']
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
