export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const ct = (req.headers.get('content-type') || '').toLowerCase();
  const data = ct.includes('application/json')
    ? await req.json().catch(() => ({}))
    : Object.fromEntries((await req.formData()).entries());

  console.log('TWILIO STATUS', {
    CallStatus: data.CallStatus,
    CallSid: data.CallSid,
    From: data.From,
    To: data.To,
    Timestamp: new Date().toISOString(),
  });

  return new Response('ok');
}
