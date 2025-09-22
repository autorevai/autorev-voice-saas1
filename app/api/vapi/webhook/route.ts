export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const event = await req.json().catch(() => ({}));
  console.log('VAPI WEBHOOK', event?.type || 'unknown');
  return new Response('ok');
}
