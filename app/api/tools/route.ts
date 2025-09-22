// app/api/tools/route.ts
// Endpoint Vapi "Custom Tool" calls (create_booking, quote_estimate, handoff_sms, take_payment, update_crm_note)

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ---- helpers ---------------------------------------------------------------
function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
function ok(data: any) { return json({ ok: true, data }); }
function err(msg: string, code = 400) { return json({ ok: false, error: msg }, code); }

async function isAuthorized(req: Request) {
  // Optional shared-secret check (set WEBHOOK_SHARED_SECRET in Vercel to enable)
  const configured = process.env.WEBHOOK_SHARED_SECRET;
  if (!configured) return true;
  const got = req.headers.get('x-shared-secret');
  return got === configured;
}

// Allow all fields we might see from different tool callers
type ToolPayload = {
  toolName?: string;
  name?: string;
  input?: any;
  args?: any;
  [k: string]: any;
};

// ---- route -----------------------------------------------------------------
export async function POST(req: Request) {
  if (!(await isAuthorized(req))) return err('unauthorized', 401);

  let payload: ToolPayload = {};
  try { payload = (await req.json()) as ToolPayload; } catch {}

  // Tool name can come from a header or the body
  const headerTool = req.headers.get('x-tool-name') ?? '';
  const bodyTool = payload.toolName ?? payload.name ?? '';
  const toolName = String(headerTool || bodyTool || '').trim();

  // Arguments can be under args, input, or at the top level
  const args = payload.args ?? payload.input ?? payload;

  console.log('TOOL_CALL', { toolName, args });

  switch (toolName) {
    case 'create_booking': {
      const dur = Number(args?.duration_minutes ?? 90);
      // TODO: write to Supabase/Calendar here
      return ok({
        confirmation: 'BK-' + Math.random().toString(36).slice(2, 8),
        duration_minutes: dur,
      });
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
      // TODO: integrate Twilio SMS later
      console.log('SMS →', args?.phone, args?.message);
      return ok({ queued: true });
    }

    case 'take_payment': {
      // TODO: create Stripe Payment Link
      return ok({ payment_url: 'https://example.com/pay/demo' });
    }

    case 'update_crm_note': {
      // TODO: write to Supabase/CRM
      console.log('CRM NOTE', args);
      return ok({ saved: true });
    }

    default:
      return err(`unknown tool: ${toolName || '(empty)'}`);
  }
}
