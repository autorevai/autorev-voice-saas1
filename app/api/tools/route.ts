// app/api/tools/route.ts
import { createClient } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  // Verify auth
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const tool = req.headers.get('x-tool-name') || '';
  const args = await req.json().catch(() => ({}));
  
  // Get tenant ID (from header or demo fallback)
  const tenantId = req.headers.get('x-tenant-id') || process.env.DEMO_TENANT_ID;
  
  if (!tenantId) {
    console.warn('No tenant_id provided, using demo tenant');
    // For now, use a fallback tenant ID if none provided
    const fallbackTenantId = '00000000-0000-0000-0000-000000000001';
    console.log('Using fallback tenant ID:', fallbackTenantId);
  }

  if (tool === 'create_booking') {
    const db = createClient();
    
    // Use fallback tenant ID if none provided
    const finalTenantId = tenantId || '00000000-0000-0000-0000-000000000001';
    
    // Generate confirmation code
    const confirmation = generateConfirmationCode();
    
    // Parse preferred time into actual datetime
    const startTime = parsePreferredTime(args.preferred_time);
    
    // Save to database
    const { data: booking, error } = await db.from('bookings').insert({
      tenant_id: finalTenantId,
      confirmation: confirmation,
      window_text: args.preferred_time || 'Next available',
      start_ts: startTime,
      duration_min: 90, // Default service duration
      name: args.name,
      phone: args.phone,
      email: args.email || null,
      address: args.address,
      city: args.city || null,
      state: args.state || null,
      zip: args.zip || null,
      summary: args.service_type,
      equipment: args.equipment_info || null,
      priority: args.service_type?.toLowerCase().includes('emergency') ? 'urgent' : 'standard',
      source: 'voice_call'
    }).select().single();
    
    if (error) {
      console.error('Booking insert error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to create booking',
        say: "I apologize, but I'm having trouble creating your appointment right now. Let me take your information and have someone call you back to schedule."
      });
    }
    
    // Return success to VAPI
    return NextResponse.json({
      success: true,
      confirmation: confirmation,
      say: `Perfect! Your appointment is confirmed. Your confirmation code is ${confirmation}. We'll see you ${args.preferred_time}.`,
      booking_id: booking.id
    });
  }
  
  if (tool === 'quote_estimate') {
    // Provide price range based on service type
    const serviceType = args.service_type?.toLowerCase() || '';
    let priceRange = '$89-$129';
    
    if (serviceType.includes('emergency')) priceRange = '$150-$250';
    else if (serviceType.includes('install')) priceRange = '$2,500-$8,000';
    else if (serviceType.includes('repair')) priceRange = '$125-$350';
    else if (serviceType.includes('maintenance')) priceRange = '$89-$159';
    
    return NextResponse.json({
      success: true,
      price_range: priceRange,
      say: `For ${args.service_type}, the typical cost ranges from ${priceRange}. The final price depends on the specific issue and parts needed. Would you like to schedule an appointment?`
    });
  }
  
  if (tool === 'handoff_sms') {
    // Log handoff request
    const db = createClient();
    await db.from('tool_results').insert({
      call_id: null, // Will be updated by webhook
      tool_name: 'handoff_sms',
      request_json: args,
      response_json: { sms_type: 'handoff_request' },
      success: true
    });
    
    return NextResponse.json({
      success: true,
      say: "I've noted that you'd like someone to call you back. We'll reach out to you at this number within the next hour."
    });
  }
  
  if (tool === 'update_crm_note') {
    // Log CRM note
    const db = createClient();
    await db.from('tool_results').insert({
      call_id: null,
      tool_name: 'update_crm_note',
      request_json: args,
      response_json: { note_saved: true },
      success: true
    });
    
    return NextResponse.json({
      success: true,
      say: "I've made a note of that. Is there anything else I can help you with?"
    });
  }

  return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 });
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
