// app/api/tools/route.ts
import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// Helper to log with timestamps
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  console.log(`[${timestamp}] [TOOLS_API_${level}] ${message}`, logData);
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Log incoming request
    log('INFO', 'Tools API request received', {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries())
    });

    // Verify auth
    if (!authorized(req)) {
      log('WARN', 'Unauthorized request', { 
        headers: Object.fromEntries(req.headers.entries()) 
      });
      return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
    }

    const tool = req.headers.get('x-tool-name') || '';
    const args = await req.json().catch(() => ({}));
    
    // Extract call ID from VAPI message format or headers
    const callId = req.headers.get('x-vapi-call-id') || 
                   args?.message?.call?.id || 
                   args?.call?.id || '';
    
    // Get tenant ID (from header or demo fallback)
    const tenantId = req.headers.get('x-tenant-id') || process.env.DEMO_TENANT_ID;
    
    log('INFO', 'Processing tool call', { 
      tool, 
      callId, 
      tenantId, 
      args,
      timestamp: new Date().toISOString()
    });
  
  if (!tenantId) {
    console.warn('No tenant_id provided, using demo tenant');
    // For now, use a fallback tenant ID if none provided
    const fallbackTenantId = '00000000-0000-0000-0000-000000000001';
    console.log('Using fallback tenant ID:', fallbackTenantId);
  }

  if (tool === 'create_booking') {
    log('INFO', 'Processing create_booking tool', { 
      tool, 
      callId, 
      tenantId: tenantId || 'fallback',
      rawArgs: args
    });
    
    const db = createClient();
    
    // Use fallback tenant ID if none provided
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
    
    // Extract data from VAPI message format
    const bookingData = extractBookingData(args);
    log('INFO', 'Extracted booking data', { bookingData });
    
    // Generate confirmation code
    const confirmation = generateConfirmationCode();
    log('INFO', 'Generated confirmation code', { confirmation });
    
    // Parse preferred time into actual datetime
    const startTime = parsePreferredTime(bookingData.preferred_time);
    log('INFO', 'Parsed preferred time', { 
      original: bookingData.preferred_time, 
      parsed: startTime 
    });
    
    // Save to database
    log('INFO', 'Inserting booking into database', { 
      tenantId: finalTenantId,
      confirmation,
      bookingData: {
        name: bookingData.name,
        phone: bookingData.phone,
        email: bookingData.email,
        address: bookingData.address,
        service_type: bookingData.service_type
      }
    });
    
    const { data: booking, error } = await db.from('bookings').insert({
      tenant_id: finalTenantId,
      confirmation: confirmation,
      window_text: bookingData.preferred_time || 'Next available',
      start_ts: startTime,
      duration_min: 90, // Default service duration
      name: bookingData.name,
      phone: bookingData.phone,
      email: bookingData.email || null,
      address: bookingData.address,
      city: bookingData.city || null,
      state: bookingData.state || null,
      zip: bookingData.zip || null,
      summary: bookingData.service_type,
      equipment: bookingData.equipment_info || null,
      priority: bookingData.service_type?.toLowerCase().includes('emergency') ? 'urgent' : 'standard',
      source: 'voice_call'
    }).select().single();
    
    if (error) {
      log('ERROR', 'Booking insert failed', { 
        error: error.message,
        code: error.code,
        details: error.details,
        bookingData
      });
      return NextResponse.json({
        success: false,
        error: 'Failed to create booking',
        say: "I apologize, but I'm having trouble creating your appointment right now. Let me take your information and have someone call you back to schedule."
      });
    }
    
    log('INFO', 'Booking created successfully', { 
      bookingId: booking.id,
      confirmation: booking.confirmation,
      callId
    });
    
    // Log tool result
    await db.from('tool_results').insert({
      call_id: callId,
      tenant_id: finalTenantId,
      tool_name: 'create_booking',
      request_json: args,
      response_json: { confirmation, booking_id: booking.id },
      success: true
    });
    
    // Return success to VAPI
    return NextResponse.json({
      success: true,
      confirmation: confirmation,
      say: `Perfect! Your appointment is confirmed. Your confirmation code is ${confirmation}. We'll see you ${args.preferred_time}.`,
      booking_id: booking.id
    });
  }
  
  if (tool === 'quote_estimate') {
    log('INFO', 'Processing quote_estimate tool', { 
      tool, 
      callId, 
      tenantId: tenantId || 'fallback',
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const toolData = extractToolData(args, 'quote_estimate');
    log('INFO', 'Extracted quote data', { toolData });
    
    // Provide price range based on service type
    const serviceType = toolData.service_type?.toLowerCase() || '';
    let priceRange = '$89-$129';
    
    if (serviceType.includes('emergency')) priceRange = '$150-$250';
    else if (serviceType.includes('install')) priceRange = '$2,500-$8,000';
    else if (serviceType.includes('repair')) priceRange = '$125-$350';
    else if (serviceType.includes('maintenance')) priceRange = '$89-$159';
    
    log('INFO', 'Determined price range', { 
      serviceType, 
      priceRange 
    });
    
    // Log tool result
    const db = createClient();
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
    
    await db.from('tool_results').insert({
      call_id: callId,
      tenant_id: finalTenantId,
      tool_name: 'quote_estimate',
      request_json: toolData,
      response_json: { price_range: priceRange, service_type: serviceType },
      success: true
    });
    
    return NextResponse.json({
    success: true,
    price_range: priceRange,
      say: `For ${toolData.service_type}, the typical cost ranges from ${priceRange}. The final price depends on the specific issue and parts needed. Would you like to schedule an appointment?`
    });
  }
  
  if (tool === 'handoff_sms') {
    log('INFO', 'Processing handoff_sms tool', { 
      tool, 
      callId, 
      tenantId: tenantId || 'fallback',
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const toolData = extractToolData(args, 'handoff_sms');
    log('INFO', 'Extracted handoff data', { toolData });
    
    // Log handoff request
    const db = createClient();
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
    
    await db.from('tool_results').insert({
      call_id: callId,
      tenant_id: finalTenantId,
      tool_name: 'handoff_sms',
      request_json: toolData,
      response_json: { sms_type: 'handoff_request' },
      success: true
    });
    
    return NextResponse.json({
    success: true,
      say: "I've noted that you'd like someone to call you back. We'll reach out to you at this number within the next hour."
    });
  }
  
  if (tool === 'update_crm_note') {
    log('INFO', 'Processing update_crm_note tool', { 
      tool, 
      callId, 
      tenantId: tenantId || 'fallback',
      rawArgs: args
    });
    
    // Extract data from VAPI message format
    const toolData = extractToolData(args, 'update_crm_note');
    log('INFO', 'Extracted CRM note data', { toolData });
    
    // Log CRM note
    const db = createClient();
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
    
    await db.from('tool_results').insert({
      call_id: callId,
      tenant_id: finalTenantId,
      tool_name: 'update_crm_note',
      request_json: toolData,
      response_json: { note_saved: true },
      success: true
    });
    
    return NextResponse.json({
    success: true,
      say: "I've made a note of that. Is there anything else I can help you with?"
    });
  }

  log('WARN', 'Unknown tool requested', { tool, callId, tenantId });
  return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 });

  } catch (error: any) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Tools API processing failed', {
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
      message: error.message 
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

function parsePreferredTime(timeStr: string): string {
  // Parse natural language time into ISO datetime
  // For now, default to tomorrow 9am
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  
  // TODO: Use a proper date parsing library for production
  return tomorrow.toISOString();
}

function extractToolData(args: any, toolName: string): any {
  // Handle VAPI message format where data is nested in message.toolCalls
  if (args?.message?.toolCalls && Array.isArray(args.message.toolCalls)) {
    // Find the specific tool call
    const toolCall = args.message.toolCalls.find((call: any) => 
      call.function?.name === toolName || call.toolCallId === toolName
    );
    
    if (toolCall?.function?.parameters) {
      return toolCall.function.parameters;
    }
  }
  
  // Fallback to direct args (for testing)
  return args;
}

function extractBookingData(args: any): any {
  return extractToolData(args, 'create_booking');
}
