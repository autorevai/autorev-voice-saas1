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
// HELPER FUNCTIONS
// ========================================

// Extract customer data from conversation transcript and update calls table
async function extractAndUpdateCustomerData(
  callId: string, 
  transcript: string, 
  supabase: any, 
  log: any
) {
  try {
    // Get current call data
    const { data: existingCall } = await supabase
      .from('calls')
      .select('id, customer_name, customer_phone, customer_address, customer_city, customer_state, customer_zip')
      .eq('vapi_call_id', callId)
      .single();

    if (!existingCall) {
      log.warn('Call not found for customer data extraction', { callId });
      return;
    }

    // Extract customer information from transcript using regex patterns
    const updates: any = {};
    
    // Extract name patterns: "My name is John", "I'm Sarah", "This is Mike"
    if (!existingCall.customer_name) {
      const nameMatch = transcript.match(/(?:my name is|i'm|this is|i am)\s+([a-zA-Z\s]+?)(?:\s|$|\.|,)/i);
      if (nameMatch) {
        const name = nameMatch[1].trim();
        if (name.length > 1 && name.length < 50) {
          updates.customer_name = name;
          console.log('✅ DB CALL: Customer name extracted from conversation:', name);
        }
      }
    }

    // Extract phone patterns: "My number is 555-1234", "Call me at 740-739-3487"
    if (!existingCall.customer_phone) {
      const phoneMatch = transcript.match(/(?:my number is|call me at|my phone is|number is)\s*([0-9\-\(\)\s\+]+)/i);
      if (phoneMatch) {
        let phone = phoneMatch[1].replace(/[^\d]/g, '');
        if (phone.length === 10) {
          phone = '+1' + phone;
        } else if (phone.length === 11 && phone.startsWith('1')) {
          phone = '+' + phone;
        }
        if (phone.length >= 10) {
          updates.customer_phone = phone;
          console.log('✅ DB CALL: Customer phone extracted from conversation:', phone);
        }
      }
    }

    // Extract address patterns: "My address is 123 Main St", "I live at 456 Oak Ave"
    if (!existingCall.customer_address) {
      const addressMatch = transcript.match(/(?:my address is|i live at|address is|located at)\s+([^,\.]+?)(?:\s|$|\.|,)/i);
      if (addressMatch) {
        const address = addressMatch[1].trim();
        if (address.length > 5 && address.length < 200) {
          updates.customer_address = address;
          console.log('✅ DB CALL: Customer address extracted from conversation:', address);
        }
      }
    }

    // Extract city patterns: "I'm in Columbus", "City is Dublin", "Located in Westerville"
    if (!existingCall.customer_city) {
      const cityMatch = transcript.match(/(?:i'm in|city is|located in|i live in)\s+([a-zA-Z\s]+?)(?:\s|$|\.|,|,)/i);
      if (cityMatch) {
        const city = cityMatch[1].trim();
        if (city.length > 1 && city.length < 50) {
          updates.customer_city = city;
          console.log('✅ DB CALL: Customer city extracted from conversation:', city);
        }
      }
    }

    // Extract state patterns: "Ohio", "In Ohio", "State is Ohio"
    if (!existingCall.customer_state) {
      const stateMatch = transcript.match(/(?:in\s+|state is\s+|i'm in\s+)?(ohio|california|texas|florida|new york|illinois|pennsylvania|georgia|north carolina|michigan|new jersey|virginia|washington|arizona|massachusetts|tennessee|indiana|missouri|maryland|wisconsin|colorado|minnesota|south carolina|alabama|louisiana|kentucky|oregon|oklahoma|connecticut|utah|iowa|nevada|arkansas|mississippi|kansas|new mexico|nebraska|west virginia|idaho|hawaii|new hampshire|maine|montana|rhode island|delaware|south dakota|north dakota|alaska|vermont|wyoming)/i);
      if (stateMatch) {
        const state = stateMatch[1];
        updates.customer_state = state;
        console.log('✅ DB CALL: Customer state extracted from conversation:', state);
      }
    }

    // Extract zip patterns: "43068", "Zip is 43068", "My zip is 43068"
    if (!existingCall.customer_zip) {
      const zipMatch = transcript.match(/(?:zip is|my zip is|zip code is|postal code is)\s*(\d{5}(?:-\d{4})?)/i);
      if (zipMatch) {
        const zip = zipMatch[1];
        updates.customer_zip = zip;
        console.log('✅ DB CALL: Customer zip extracted from conversation:', zip);
      }
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      await supabase
        .from('calls')
        .update(updates)
        .eq('vapi_call_id', callId);

      log.info('Customer data updated from conversation', {
        callId,
        updates,
        fieldsUpdated: Object.keys(updates)
      });
    }

  } catch (error: any) {
    log.error('Failed to extract customer data from conversation', {
      error: error.message,
      callId
    });
  }
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

    // Only log important webhook types
    if (messageType === 'assistant-request' || messageType === 'end-of-call-report') {
      console.log('📥 WEBHOOK:', messageType);
    }

    // ========================================
    // 3. EXTRACT CALL DATA
    // ========================================
    const callData = extractCallData(payload);

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

    // Tenant detected - continue processing

    // ========================================
    // HANDLE: assistant-request (Call Start)
    // ========================================
    if (messageType === 'assistant-request') {
      console.log('📞 Call starting:', callData.callId?.substring(0, 12));

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
            customer_name: callData.customer.name || null,
            customer_phone: callData.customer.phone || null,
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
      console.log('📴 Call ended:', callData.callId?.substring(0, 12), `(${callData.duration}s)`);

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
            customer_name: callData.customer.name || null,
            customer_phone: callData.customer.phone || null,
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

          // Link any bookings that have this vapi_call_id in notes
          await supabase
            .from('bookings')
            .update({ call_id: newCall.id })
            .eq('tenant_id', tenantId)
            .like('notes', `%VAPI_CALL_ID:${callData.callId}%`)
            .is('call_id', null);

          // Update outcome to 'booked' if booking exists
          const { data: linkedBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('call_id', newCall.id)
            .limit(1);

          if (linkedBookings && linkedBookings.length > 0) {
            await supabase
              .from('calls')
              .update({ outcome: 'booked' })
              .eq('id', newCall.id);
          }
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

        // Link any bookings that have this vapi_call_id in notes
        await supabase
          .from('bookings')
          .update({ call_id: updatedCall.id })
          .eq('tenant_id', tenantId)
          .like('notes', `%VAPI_CALL_ID:${callData.callId}%`)
          .is('call_id', null);

        // Update outcome to 'booked' if booking exists
        const { data: linkedBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('call_id', updatedCall.id)
          .limit(1);

        if (linkedBookings && linkedBookings.length > 0) {
          await supabase
            .from('calls')
            .update({ outcome: 'booked' })
            .eq('id', updatedCall.id);
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
    // HANDLE: status-update
    // ========================================
    if (messageType === 'status-update') {
      log.info('Status update received', {
        callId: callData.callId,
        status: message?.status
      });

      // Create call record if it doesn't exist yet
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
            customer_name: callData.customer.name || null,
            customer_phone: callData.customer.phone || null,
            raw_json: {
              call_id: callData.callId,
              assistant_id: callData.assistantId,
              phone_number: callData.phoneNumber,
              customer: {
                phone: callData.customer.phone,
                name: callData.customer.name
              },
              started_at: callData.startedAt,
              status: 'in-progress'
            }
          })
          .select()
          .single();

        if (insertError) {
          log.error('Failed to create call on status-update', {
            error: insertError.message,
            callId: callData.callId
          });
        } else {
          console.log('✅ CALL CREATED on status-update:', newCall.id);
          log.info('Call created on status-update', {
            dbCallId: newCall.id,
            vapiCallId: callData.callId,
            tenantId
          });

          // Link any bookings immediately
          await supabase
            .from('bookings')
            .update({ call_id: newCall.id })
            .eq('tenant_id', tenantId)
            .like('notes', `%VAPI_CALL_ID:${callData.callId}%`)
            .is('call_id', null);

          // Update outcome to 'booked' if booking exists
          const { data: linkedBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('call_id', newCall.id)
            .limit(1);

          if (linkedBookings && linkedBookings.length > 0) {
            await supabase
              .from('calls')
              .update({ outcome: 'booked' })
              .eq('id', newCall.id);
            console.log('✅ OUTCOME updated to booked');
          }
        }
      } else {
        // Call exists - just check if booking was created and link it
        await supabase
          .from('bookings')
          .update({ call_id: existingCall.id })
          .eq('tenant_id', tenantId)
          .like('notes', `%VAPI_CALL_ID:${callData.callId}%`)
          .is('call_id', null);

        // Update outcome to 'booked' if booking exists
        const { data: linkedBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('call_id', existingCall.id)
          .limit(1);

        if (linkedBookings && linkedBookings.length > 0) {
          await supabase
            .from('calls')
            .update({ outcome: 'booked' })
            .eq('id', existingCall.id);
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
    // HANDLE: tool-calls (extract customer data progressively)
    // ========================================
    if (messageType === 'tool-calls') {
      const toolNames = message?.toolCalls?.map((t: any) => t.function?.name) || [];

      console.log('🔧 TOOL CALLS:', toolNames.join(', '));

      // Find the call record
      const { data: existingCall } = await supabase
        .from('calls')
        .select('id, customer_name, customer_phone, customer_address, customer_city, customer_state, customer_zip')
        .eq('vapi_call_id', callData.callId)
        .single();

      if (existingCall && message?.toolCalls) {
        for (const toolCall of message.toolCalls) {
          const toolName = toolCall.function?.name;

          // Extract customer data from create_booking tool
          if (toolName === 'create_booking') {
            let params: any = {};

            // Parse arguments (can be string or object)
            if (typeof toolCall.function?.arguments === 'string') {
              try {
                params = JSON.parse(toolCall.function.arguments);
              } catch {
                params = toolCall.function?.parameters || {};
              }
            } else {
              params = toolCall.function?.arguments || toolCall.function?.parameters || {};
            }

            // Extract customer info
            const customerName = params.name || params.customer_name;
            const customerPhone = params.phone || params.customer_phone || params.phone_number;
            const customerAddress = params.address || params.customer_address;
            const customerCity = params.city || params.customer_city;
            const customerState = params.state || params.customer_state;
            const customerZip = params.zip || params.customer_zip || params.zip_code;

            // Update call record progressively
            const updates: any = {};

            if (customerName && !existingCall.customer_name) {
              updates.customer_name = customerName;
              console.log('✅ DB CALL: Customer name added:', customerName);
            }

            if (customerPhone && !existingCall.customer_phone) {
              updates.customer_phone = customerPhone;
              console.log('✅ DB CALL: Customer phone added:', customerPhone);
            }

            if (customerAddress && !existingCall.customer_address) {
              updates.customer_address = customerAddress;
              console.log('✅ DB CALL: Customer address added:', customerAddress);
            }

            if (customerCity && !existingCall.customer_city) {
              updates.customer_city = customerCity;
              console.log('✅ DB CALL: Customer city added:', customerCity);
            }

            if (customerState && !existingCall.customer_state) {
              updates.customer_state = customerState;
              console.log('✅ DB CALL: Customer state added:', customerState);
            }

            if (customerZip && !existingCall.customer_zip) {
              updates.customer_zip = customerZip;
              console.log('✅ DB CALL: Customer zip added:', customerZip);
            }

            // Apply updates if any
            if (Object.keys(updates).length > 0) {
              await supabase
                .from('calls')
                .update(updates)
                .eq('id', existingCall.id);

              log.info('Call updated with customer data from tool', {
                callId: callData.callId,
                updates: Object.keys(updates)
              });
            }
          }
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

      // Extract customer data from conversation updates
      if (messageType === 'conversation-update' && message?.transcript) {
        await extractAndUpdateCustomerData(callData.callId, message.transcript, supabase, log);
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
