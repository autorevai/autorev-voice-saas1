// app/api/tools/route.ts
import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { validateBookingData } from '@/lib/validation';
import { getOrCreateRequestId, createLogger } from '@/lib/request-id';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = getOrCreateRequestId(req);
  const log = createLogger(requestId, 'TOOLS_API');

  try {
    const tool = req.headers.get('x-tool-name') || '';
    console.log('🔧 Tool:', tool);

    // Verify auth
    if (!authorized(req)) {
      console.error('❌ UNAUTHORIZED TOOL REQUEST');
      log.warn('Unauthorized request', {
        headers: Object.fromEntries(req.headers.entries())
      });
      return NextResponse.json({ success: false, error: 'unauthorized', requestId }, { status: 401 });
    }

    const args = await req.json().catch(() => ({}));

    // Extract call ID and assistant ID from VAPI message format or headers
    const callId = req.headers.get('x-vapi-call-id') ||
                   args?.message?.call?.id ||
                   args?.call?.id || '';

    const assistantId = args?.message?.call?.assistantId ||
                       args?.call?.assistantId || '';

    // Get tenant ID - try multiple strategies
    const db = createClient();
    let tenantId = req.headers.get('x-tenant-id') || null;

    // Strategy 1: Look up tenant from assistants table using assistant_id
    if (!tenantId && assistantId) {
      const { data: assistant } = await db
        .from('assistants')
        .select('tenant_id')
        .eq('vapi_assistant_id', assistantId)
        .single();

      if (assistant) {
        tenantId = assistant.tenant_id;
      }
    }

    // Strategy 2: Fallback to demo tenant only if absolutely necessary
    if (!tenantId) {
      tenantId = process.env.DEMO_TENANT_ID || null;
    }

  if (tool === 'create_booking') {
    // Extract data from VAPI message format
    const extraction = extractBookingData(args);
    const bookingData = extraction.data;

    // Validate booking data
    const validationResult = validateBookingData(bookingData);
    if (!validationResult.valid) {
      log.error('Booking validation failed', {
        error: validationResult.error,
        bookingData
      });
      return NextResponse.json({
        success: false,
        error: 'Invalid booking data',
        say: "I'm sorry, but some of the information you provided appears to be incomplete or invalid. Could you please verify your phone number and address?",
        requestId
      });
    }

    // Use sanitized data
    const sanitized = validationResult.sanitized;

    // Generate confirmation code
    const confirmation = generateConfirmationCode();

    // Parse preferred time into actual datetime
    const bookingStartTime = parsePreferredTime(sanitized.preferred_time || 'tomorrow 9am');

    // Store booking with vapi_call_id in metadata for later linking
    const { data: booking, error } = await db.from('bookings').insert({
      tenant_id: tenantId,
      call_id: null, // Will be linked later in end-of-call-report
      confirmation: confirmation,
      window_text: sanitized.preferred_time || 'Next available',
      start_ts: bookingStartTime,
      duration_min: 90, // Default service duration
      name: sanitized.name,
      phone: sanitized.phone,
      email: sanitized.email,
      address: sanitized.address,
      city: sanitized.city,
      state: sanitized.state,
      zip: sanitized.zip,
      summary: sanitized.service_type,
      equipment: sanitized.equipment_info || null,
      priority: sanitized.service_type?.toLowerCase().includes('emergency') ? 'urgent' : 'standard',
      source: 'voice_call'
    }).select().single();
    
    if (error) {
      log.error('Booking insert failed', { 
        error: error.message,
        code: error.code,
        details: error.details,
        bookingData
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create booking',
        say: "I apologize, but I'm having trouble creating your appointment right now. Let me take your information and have someone call you back to schedule.",
        requestId
      });
    }

    console.log('✅ Booking created:', confirmation, '/', sanitized.name);

    const duration = Date.now() - startTime;

    // Return success to VAPI
    // Format time for speech-friendly output (replace hyphens with "to")
    const speakableTime = sanitized.preferred_time
      ? sanitized.preferred_time.replace(/(\d+)-(\d+)/g, '$1 to $2')
      : 'soon';

    return NextResponse.json({
      success: true,
      confirmation: confirmation,
      say: `Perfect! Your appointment is confirmed. We'll see you ${speakableTime}. Is there anything else I can help you with?`,
      booking_id: booking.id,
      requestId,
      duration
    });
  }

  if (tool === 'quote_estimate') {
    log.info('Processing quote_estimate tool', {
      tool,
      callId,
      tenantId,
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const extraction = extractToolData(args, 'quote_estimate');
    const toolData = extraction.data;
    log.info('Extracted quote data', {
      toolData,
      messageFormat: extraction.format
    });
    
    // Provide price range based on service type
    const serviceType = toolData.service_type?.toLowerCase() || '';
    let priceRange = '$89-$129';
    
    if (serviceType.includes('emergency')) priceRange = '$150-$250';
    else if (serviceType.includes('install')) priceRange = '$2,500-$8,000';
    else if (serviceType.includes('repair')) priceRange = '$125-$350';
    else if (serviceType.includes('maintenance')) priceRange = '$89-$159';

    log.info('Determined price range', { 
      serviceType, 
      priceRange 
    });
    
    // Log tool result (only if we have a valid call_id)

    if (callId) {
      try {
        await db.from('tool_results').insert({
          call_id: callId,
          tool_name: 'quote_estimate',
          request_json: toolData,
          response_json: { price_range: priceRange, service_type: serviceType },
          success: true
        });
        log.info('Tool result logged', { tool: 'quote_estimate', callId });
      } catch (toolError: any) {
        log.warn('Failed to log tool result', {
          error: toolError.message,
          tool: 'quote_estimate',
          callId
        });
      }
    } else {
      log.warn('Skipping tool result logging - no call_id', { tool: 'quote_estimate' });
    }

    const duration = Date.now() - startTime;
    log.info('quote_estimate completed successfully', { duration, priceRange });

    return NextResponse.json({
      success: true,
      price_range: priceRange,
      say: `For ${toolData.service_type || 'this service'}, the typical cost ranges from ${priceRange}. The final price depends on the specific issue and parts needed. Would you like to schedule an appointment?`,
      requestId,
      duration
    });
  }

  if (tool === 'handoff_sms') {
    log.info('Processing handoff_sms tool', {
      tool,
      callId,
      tenantId,
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const extraction = extractToolData(args, 'handoff_sms');
    const toolData = extraction.data;
    log.info('Extracted handoff data', {
      toolData,
      messageFormat: extraction.format
    });

    // Log handoff request (only if we have a valid call_id)

    if (callId) {
      try {
        await db.from('tool_results').insert({
          call_id: callId,
          tool_name: 'handoff_sms',
          request_json: toolData,
          response_json: { sms_type: 'handoff_request' },
          success: true
        });
        log.info('Tool result logged', { tool: 'handoff_sms', callId });
      } catch (toolError: any) {
        log.warn('Failed to log tool result', {
          error: toolError.message,
          tool: 'handoff_sms',
          callId
        });
      }
    } else {
      log.warn('Skipping tool result logging - no call_id', { tool: 'handoff_sms' });
    }

    const duration = Date.now() - startTime;
    log.info('handoff_sms completed successfully', { duration });

    return NextResponse.json({
      success: true,
      say: "I've noted that you'd like someone to call you back. We'll reach out to you at this number within the next hour.",
      requestId,
      duration
    });
  }

  if (tool === 'update_crm_note') {
    log.info('Processing update_crm_note tool', {
      tool,
      callId,
      tenantId,
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const extraction = extractToolData(args, 'update_crm_note');
    const toolData = extraction.data;
    log.info('Extracted CRM note data', {
      toolData,
      messageFormat: extraction.format
    });

    // Log CRM note (only if we have a valid call_id)

    if (callId) {
      try {
        await db.from('tool_results').insert({
          call_id: callId,
          tool_name: 'update_crm_note',
          request_json: toolData,
          response_json: { note_saved: true },
          success: true
        });
        log.info('Tool result logged', { tool: 'update_crm_note', callId });
      } catch (toolError: any) {
        log.warn('Failed to log tool result', {
          error: toolError.message,
          tool: 'update_crm_note',
          callId
        });
      }
    } else {
      log.warn('Skipping tool result logging - no call_id', { tool: 'update_crm_note' });
    }

    const duration = Date.now() - startTime;
    log.info('update_crm_note completed successfully', { duration });

    return NextResponse.json({
      success: true,
      say: "I've made a note of that. Is there anything else I can help you with?",
      requestId,
      duration
    });
  }

  log.warn('Unknown tool requested', { tool, callId, tenantId });
  return NextResponse.json({ success: false, error: 'unknown_tool', requestId }, { status: 400 });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log.error('Tools API processing failed', {
      error: error.message,
      stack: error.stack,
      duration,
      tool: req.headers.get('x-tool-name') || 'unknown',
      callId: req.headers.get('x-vapi-call-id') || 'unknown',
      tenantId: req.headers.get('x-tenant-id') || process.env.DEMO_TENANT_ID || 'unknown'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error.message,
      requestId
    }, { status: 500 });
  }
}

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-shared-secret') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  const expected = process.env.WEBHOOK_SHARED_SECRET || '';
  return !!expected && token === expected;
}

function generateConfirmationCode(): string {
  // Generate 8-character alphanumeric code
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function parsePreferredTime(_timeStr: string): string {
  // Parse natural language time into ISO datetime
  // For now, default to tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);

  // TODO: Use a proper date parsing library for production
  return tomorrow.toISOString();
}

function extractToolData(args: any, toolName: string): { data: any; format: string } {
  // VAPI can send data in multiple formats depending on the configuration:
  // Format 1: Direct args { name: 'John', phone: '555-1234', ... }
  // Format 2: Nested in message.toolCalls array
  // Format 3: Nested in message.toolCallList array
  // Format 4: Single tool call in message.toolCall object

  // Try Format 2: message.toolCalls array
  if (args?.message?.toolCalls && Array.isArray(args.message.toolCalls)) {
    const toolCall = args.message.toolCalls.find((call: any) =>
      call.function?.name === toolName ||
      call.toolCallId === toolName ||
      call.name === toolName
    );

    if (toolCall?.function?.parameters) {
      return { data: toolCall.function.parameters, format: 'message.toolCalls[].function.parameters' };
    }
    if (toolCall?.function?.arguments) {
      // Arguments might be a JSON string
      try {
        const parsed = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
        return { data: parsed, format: 'message.toolCalls[].function.arguments' };
      } catch {
        return { data: toolCall.function.arguments, format: 'message.toolCalls[].function.arguments (raw)' };
      }
    }
    if (toolCall?.parameters) {
      return { data: toolCall.parameters, format: 'message.toolCalls[].parameters' };
    }
  }

  // Try Format 3: message.toolCallList array
  if (args?.message?.toolCallList && Array.isArray(args.message.toolCallList)) {
    const toolCall = args.message.toolCallList.find((call: any) =>
      call.function?.name === toolName ||
      call.name === toolName
    );

    if (toolCall?.function?.parameters) {
      return { data: toolCall.function.parameters, format: 'message.toolCallList[].function.parameters' };
    }
    if (toolCall?.parameters) {
      return { data: toolCall.parameters, format: 'message.toolCallList[].parameters' };
    }
  }

  // Try Format 4: message.toolCall single object
  if (args?.message?.toolCall) {
    const toolCall = args.message.toolCall;
    if (toolCall.function?.name === toolName || toolCall.name === toolName) {
      if (toolCall.function?.parameters) {
        return { data: toolCall.function.parameters, format: 'message.toolCall.function.parameters' };
      }
      if (toolCall.function?.arguments) {
        try {
          const parsed = typeof toolCall.function.arguments === 'string'
            ? JSON.parse(toolCall.function.arguments)
            : toolCall.function.arguments;
          return { data: parsed, format: 'message.toolCall.function.arguments' };
        } catch {
          return { data: toolCall.function.arguments, format: 'message.toolCall.function.arguments (raw)' };
        }
      }
      if (toolCall.parameters) {
        return { data: toolCall.parameters, format: 'message.toolCall.parameters' };
      }
    }
  }

  // Try direct args object with function wrapper
  if (args?.function?.name === toolName) {
    if (args.function.parameters) {
      return { data: args.function.parameters, format: 'function.parameters' };
    }
    if (args.function.arguments) {
      try {
        const parsed = typeof args.function.arguments === 'string'
          ? JSON.parse(args.function.arguments)
          : args.function.arguments;
        return { data: parsed, format: 'function.arguments' };
      } catch {
        return { data: args.function.arguments, format: 'function.arguments (raw)' };
      }
    }
  }

  // Fallback to direct args (for testing and simple formats)
  return { data: args, format: 'direct' };
}

function extractBookingData(args: any): { data: any; format: string } {
  return extractToolData(args, 'create_booking');
}
