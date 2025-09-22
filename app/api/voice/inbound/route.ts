export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Respond to GET so a browser hit doesn't 404 (useful for sanity checks)
export async function GET() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Inbound endpoint is alive.</Say>
  <Hangup/>
</Response>`;
  return new Response(twiml, { headers: { 'content-type': 'text/xml; charset=utf-8' } });
}

async function parseBody(req: Request) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('application/json')) return await req.json();
    // Twilio defaults to application/x-www-form-urlencoded
    const raw = await req.text();
    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
  } catch {
    return {};
  }
}

export async function POST(req: Request) {
  try {
    const body = await parseBody(req);
    console.log('TWILIO INBOUND', {
      To: body?.To, From: body?.From, CallSid: body?.CallSid,
      ContentType: req.headers.get('content-type'),
    });

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Thanks for calling. Your AI receptionist will be live shortly.</Say>
  <Hangup/>
</Response>`;
    return new Response(twiml, { headers: { 'content-type': 'text/xml; charset=utf-8' } });
  } catch (e) {
    console.error('TWILIO INBOUND ERROR', e);
    const fallback = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">Temporary issue. Please try again soon.</Say>
  <Hangup/>
</Response>`;
    return new Response(fallback, { headers: { 'content-type': 'text/xml; charset=utf-8' } });
  }
}
