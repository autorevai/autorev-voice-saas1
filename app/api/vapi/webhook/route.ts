// app/api/vapi/webhook/route.ts
// Webhook inspector - Updated for VAPI's message envelope structure

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    
    // VAPI wraps everything in a "message" object
    const message = event?.message || event;
    const messageType = message?.type;
    const call = message?.call;
    
    // Log full payload for debugging
    console.log('VAPI_WEBHOOK_FULL_PAYLOAD', JSON.stringify(event, null, 2));
    
    // Log parsed structure
    console.log('VAPI_WEBHOOK_PARSED', {
      messageType,
      callId: call?.id,
      hasTranscript: !!message?.transcript,
      transcriptLength: message?.transcript?.length || 0,
      hasSummary: !!message?.summary,
      callStartedAt: call?.startedAt,
      callEndedAt: call?.endedAt,
      topLevelKeys: Object.keys(event),
      messageKeys: Object.keys(message || {}),
    });
    
    // Calculate duration if we have timestamps
    if (call?.startedAt && call?.endedAt) {
      const start = new Date(call.startedAt);
      const end = new Date(call.endedAt);
      const durationMs = end.getTime() - start.getTime();
      const durationSec = Math.round(durationMs / 1000);
      
      console.log('VAPI_WEBHOOK_DURATION', {
        callId: call.id,
        startedAt: call.startedAt,
        endedAt: call.endedAt,
        durationSec,
        durationFormatted: `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
      });
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