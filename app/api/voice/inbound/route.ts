// app/api/voice/inbound/route.ts
// Next.js App Router API route for Twilio Voice → Vapi Media Streams

import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Small helper to return XML/TwiML
function xml(body: string) {
  return new Response(body, {
    headers: { 'content-type': 'text/xml; charset=utf-8' },
  });
}

// Simple GET for sanity checks in a browser
export async function GET() {
  return new Response('OK: /api/voice/inbound', {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}

// Twilio will POST here when a call arrives
export async function POST(req: NextRequest) {
  const streamUrl = process.env.VAPI_STREAM_URL; // wss://... from Vapi Assistant → Telephony → Twilio (Media Streams)

  if (!streamUrl) {
    // Fail loudly if not configured
    const err = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Configuration error. Missing Vapi stream URL.</Say>
  <Hangup/>
</Response>`;
    return xml(err);
  }

  // OPTIONAL: protect this endpoint with the same shared secret you use elsewhere
  const want = process.env.WEBHOOK_SHARED_SECRET;
  if (want) {
    const got = req.headers.get('x-shared-secret');
    if (got !== want) {
      const deny = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Joanna">Unauthorized.</Say>
  <Hangup/>
</Response>`;
      return xml(deny);
    }
  }

  // If you need to append a token or extra params, set VAPI_STREAM_QUERY in Vercel, e.g. "assistantId=abc&foo=bar"
  const extra = (process.env.VAPI_STREAM_QUERY || '').trim();
  const url = extra ? `${streamUrl}${streamUrl.includes('?') ? '&' : '?'}${extra}` : streamUrl;

  // The TwiML that tells Twilio to open a bidirectional audio stream to Vapi
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${url}" />
  </Connect>
</Response>`;

  return xml(twiml);
}
