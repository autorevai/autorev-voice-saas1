// app/api/vapi/webhook/route.ts
// Production webhook handler - saves duration and transcript to database

import { createClient } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    
    console.log('VAPI_WEBHOOK_RECEIVED', {
      timestamp: new Date().toISOString(),
      event: JSON.stringify(event, null, 2)
    });
    
    // VAPI wraps data in a "message" envelope
    const message = event?.message || event;
    const messageType = message?.type;
    const call = message?.call;
    const callId = call?.id;
    
    if (!callId) {
      console.warn('VAPI_WEBHOOK_NO_CALL_ID', { messageType, event });
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
          // Find tenant by assistant ID from the call
          const assistantId = call?.assistantId;
          if (assistantId) {
            const { data: assistant } = await supabase
              .from('assistants')
              .select('id, tenant_id')
              .eq('vapi_assistant_id', assistantId)
              .single();
            
            if (assistant) {
              const { error: insertError } = await supabase.from('calls').insert({
                tenant_id: assistant.tenant_id,
                assistant_id: assistant.id,
                vapi_call_id: callId,
                started_at: call?.startedAt || new Date().toISOString(),
                outcome: 'unknown',
                raw_json: { message, call }
              });
              
              if (insertError) {
                console.error('VAPI_CALL_INSERT_ERROR', { callId, error: insertError });
              } else {
                console.log('VAPI_CALL_CREATED', { 
                  callId, 
                  assistantId, 
                  tenantId: assistant.tenant_id 
                });
              }
            } else {
              console.warn('VAPI_CALL_NO_ASSISTANT', { callId, assistantId });
            }
          } else {
            console.warn('VAPI_CALL_NO_ASSISTANT_ID', { callId });
          }
        }
        break;
      }
      
      case 'end-of-call-report': {
        // Call ended - save duration and transcript
        const startedAt = message?.startedAt;
        const endedAt = message?.endedAt;
        const durationSec = Math.round(message?.durationSeconds || 0);
        
        const transcript = message?.transcript || null;
        const summary = message?.summary || null;
        const endedReason = message?.endedReason || null;
        
        // Determine outcome based on the call data
        let outcome = 'unknown';
        if (endedReason === 'assistant_ended_call') {
          outcome = 'booked';
        } else if (endedReason === 'customer_ended_call') {
          outcome = 'handoff';
        }
        
        // Update call record with duration and transcript
        const { error } = await supabase
          .from('calls')
          .update({
            ended_at: endedAt || new Date().toISOString(),
            duration_sec: durationSec,
            outcome: outcome,
            transcript_url: transcript ? `data:text/plain;base64,${Buffer.from(transcript).toString('base64')}` : null,
            raw_json: { transcript, summary, endedReason, message, call }
          })
          .eq('vapi_call_id', callId);
        
        if (error) {
          console.error('VAPI_WEBHOOK_DB_ERROR', { callId, error });
        } else {
          console.log('VAPI_CALL_ENDED', {
            callId,
            durationSec,
            outcome,
            hasTranscript: !!transcript,
            transcriptLength: transcript?.length || 0,
            hasSummary: !!summary,
            endedReason
          });
        }
        break;
      }
      
      case 'status-update': {
        // Call status changed
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