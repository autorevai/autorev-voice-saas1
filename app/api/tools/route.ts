// app/api/tools/route.ts
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ToolReqAny =
  | { toolName?: string; args?: any; toolCallId?: string; sessionId?: string; callId?: string }
  | { name?: string; input?: any }
  | { input?: any; [k: string]: any };

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function ok(data: any) {
  return json({ ok: true, data });
}
function err(msg: string, code = 400) {
  return json({ ok: false, error: msg }, code);
}

async function isAuthorized(req: Request) {
  // optional but recommended
  const configured = process.env.WEBHOOK_SHARED_SECRET;
  if (!configured) return true; // skip if not set
  const got = req.headers.get('x-shared-secret');
  return got === configured;
}

export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return err('unauthorized', 401);

  let payload: ToolReqAny = {};
  try { payload = await req.json(); } catch {}

  // Prefer header name (works best with Vapi “Custom Tool”)
  const headerTool = req.headers.get('x-tool-name') || '';
  const bodyTool = payload.toolName || payload.name || '';
  const toolName = (headerTool || bodyTool || '').toString();

  // args can be {args}, {input}, or the whole body
  const args = payload.args ?? payload.input ?? payload;

  console.log('TOOL_CALL', toolName, args);

  switch (toolName) {
    case 'create_booking': {
      const dur = Number(args?.duration_minutes ?? 90);
      // TODO: write to Supabase/Calendar here
      return ok({ confirmation: 'BK-' + Math.random().toString(36).slice(2, 8), duration_minutes: dur });
    }
    case 'quote_estimate': {
      const bands: Record<string, string> = {
        diagnostic: '$89–$149 (credited to repair > $300)',
        maintenance: '$149–$249 (one system)',
        'install-estimate': 'Free in-home estimate',
        capacitor: '$150–$350 parts+labor',
        contactor: '$150–$300 parts+labor',
        'blower-motor': '$450–$950 parts+labor',
        'refrigerant-per-lb': '$90–$180/lb (R410A)',
        'inducer-motor': '$600–$1,200 parts+labor',
      };
      const msg = bands[args?.task] ?? 'Technician must diagnose for an accurate estimate.';
      return ok({ estimate: msg });
    }
    case 'handoff_sms': {
      // TODO: integrate Twilio SMS later — for now just echo
      console.log('SMS ->', args?.phone, args?.message);
      return ok({ queued: true });
    }
    case 'take_payment': {
      // TODO: Stripe payment link here
      return ok({ payment_url: 'https://example.com/pay/demo' });
    }
    case 'update_crm_note': {
      // TODO: write note to Supabase/CRM
      console.log('CRM NOTE', args);
      return ok({ saved: true });
    }
    default:
      return err('unknown tool: ' + toolName);
  }
}
