export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const event = await req.json();
    const eventType = event?.type || 'unknown';
    
    console.log('VAPI_WEBHOOK_EVENT', {
      type: eventType,
      callId: event?.call?.id,
      timestamp: new Date().toISOString()
    });

    // TODO: Process webhook and save to database
    // - assistant-request: Call started
    // - status-update: Call status changed  
    // - end-of-call-report: Call ended (has duration, transcript)
    
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