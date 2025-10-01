// app/api/vapi/webhook/route.ts
// Production webhook handler - saves duration and transcript to database

import { createClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    
    // VAPI wraps data in a "message" envelope
    const message = event?.message || event;
    const messageType = message?.type;
    const call = message?.call;
    const callId = call?.id;
    
    if (!callId) {
      console.warn('VAPI_WEBHOOK_NO_CALL_ID', { messageType });
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('VAPI_WEBHOOK_EVENT', {
      type: messageType,
      callId,
      timestamp: new Date().toISOString()
    });
    
    const supabase = createClient();
    
    // Handle different webhook types
    switch (messageType) {
      case 'assistant-request': {
        // Call started - ensure call record exists
        const { data: existingCall } = await supabase
          .from('calls')
          .select('id')
          .eq('vapi_call_id', callId)
          .single();
        
        if (!existingCall) {
          // Create call record if it doesn't exist
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id')
            .limit(1)
            .single();
          
          if (tenant) {
            await supabase.from('calls').insert({
              tenant_id: tenant.id,
              vapi_call_id: callId,
              started_at: call?.startedAt || new Date().toISOString(),
              outcome: 'unknown'
            });
            
            console.log('VAPI_CALL_CREATED', { callId });
          }
        }
        break;
      }
      
      case 'end-of-call-report': {
        // Call ended - save duration and transcript
        // VAPI provides timestamps and duration at message level, not call level
        const startedAt = message?.startedAt;
        const endedAt = message?.endedAt;
        const durationSec = Math.round(message?.durationSeconds || 0);
        
        const transcript = message?.transcript || null;
        const summary = message?.summary || null;
        const endedReason = message?.endedReason || null;
        
        // Update call record with duration and transcript
        const { error } = await supabase
          .from('calls')
          .update({
            ended_at: endedAt || new Date().toISOString(),
            duration_sec: durationSec,
            transcript_url: transcript ? `data:text/plain;base64,${Buffer.from(transcript).toString('base64')}` : null,
            raw_json: { transcript, summary, endedReason }
          })
          .eq('vapi_call_id', callId);
        
        if (error) {
          console.error('VAPI_WEBHOOK_DB_ERROR', { callId, error });
        } else {
          console.log('VAPI_CALL_ENDED', {
            callId,
            durationSec,
            hasTranscript: !!transcript,
            transcriptLength: transcript?.length || 0,
            hasSummary: !!summary,
            endedReason
          });
        }
        break;
      }
      
      case 'status-update': {
        // Call status changed (optional - you can log this if needed)
        console.log('VAPI_CALL_STATUS', {
          callId,
          status: message?.status
        });
        break;
      }
      
      default: {
        console.log('VAPI_WEBHOOK_UNKNOWN_TYPE', {
          type: messageType,
          callId
        });
      }
    }
    
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('VAPI_WEBHOOK_ERROR', error);
    return new Response(JSON.stringify({ error: 'Invalid webhook' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}