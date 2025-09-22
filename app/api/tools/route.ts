// app/api/tools/route.ts
import { NextRequest, NextResponse } from 'next/server';

// ----- Helpers
function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tool-name, x-shared-secret'
  };
}

function ok(data: any) {
  return json({ ok: true, ...data }, { status: 200, headers: corsHeaders() });
}

function bad(message: string, extra?: any) {
  return json({ ok: false, error: message, ...extra }, { status: 400, headers: corsHeaders() });
}

// ----- Types (loose on purpose for demo leniency)
type AnyObj = Record<string, any>;

type ToolName =
  | 'create_booking'
  | 'quote_estimate'
  | 'handoff_sms'
  | 'take_payment'
  | 'update_crm_note';

function env(name: string, fallback = '') {
  return process.env[name] ?? fallback;
}

const DEMO_MODE = (env('DEMO_MODE', 'true').toLowerCase() === 'true'); // default ON for demos
const SHARED_SECRET = env('WEBHOOK_SHARED_SECRET', ''); // optional for now

// ----- Shared: extract tool + args from request
async function parseRequest(req: NextRequest) {
  const headerTool = (req.headers.get('x-tool-name') ?? '').toString().trim();
  const headerSecret = (req.headers.get('x-shared-secret') ?? '').toString().trim();

  let body: AnyObj = {};
  try {
    body = (await req.json()) ?? {};
  } catch {
    // ignore; body will be {}
  }

  // Vapi may send name/toolName and input/args in different shapes
  const bodyTool = (body.toolName || body.name || '').toString().trim();
  const args: AnyObj =
    (typeof body.args === 'object' && body.args) ||
    (typeof body.input === 'object' && body.input) ||
    (body && typeof body === 'object' ? body : {});

  // Prefer header tool (what Vapi “Custom Tool” uses), else fall back to body
  const tool: ToolName = (headerTool || bodyTool) as ToolName;

  return { tool, args, headerSecret };
}

// ----- Demo utilities
function demoConfirmation() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${rnd}`;
}
function nowIso() {
  return new Date().toISOString();
}
function coerceString(x: any, fallback = '') {
  return (x === undefined || x === null) ? fallback : String(x);
}
function chooseWindowFromISO(iso?: string) {
  // Simple window detector for demo. If there is an ISO date with HH,
  // pick an 8–11/11–2/2–5 label; else default "8–11 AM next business day".
  try {
    if (iso) {
      const dt = new Date(iso);
      const h = dt.getHours();
      if (h < 11) return '8–11 AM';
      if (h < 14) return '11–2 PM';
      return '2–5 PM';
    }
  } catch {}
  return '8–11 AM';
}

// ----- Tool handlers (demo)
async function handleCreateBooking(args: AnyObj) {
  // Be lenient: only truly require a few core fields for demo success.
  const payload = {
    job_type: coerceString(args.job_type || args.type || 'diagnostic'),
    requested_start: coerceString(args.requested_start),
    duration_minutes: coerceString(args.duration_minutes || '90'),
    name: coerceString(args.name),
    phone: coerceString(args.phone),
    email: coerceString(args.email),
    address: coerceString(args.address),
    city: coerceString(args.city),
    state: coerceString(args.state),
    zip: coerceString(args.zip),
    summary: coerceString(args.summary),
    equipment: coerceString(args.equipment),
    priority: coerceString(args.priority || 'standard')
  };

  // Minimal must-haves for a believable booking
  const missing: string[] = [];
  for (const k of ['name', 'phone', 'address', 'zip']) {
    if (!payload[k as keyof typeof payload]) missing.push(k);
  }
  if (missing.length && !DEMO_MODE) {
    return bad('Missing required fields', { missing, received: payload });
  }

  // DEMO path: always "book" and return a fake confirmation
  const confirmation = demoConfirmation();
  const when = chooseWindowFromISO(payload.requested_start);
  const message = `Booked ${payload.job_type} ${when} for ${payload.name} at ${payload.address}, ${payload.city ?? ''} ${payload.state ?? ''} ${payload.zip}.`;

  // This is where you’d call Google Calendar or your real scheduler.
  // In demo mode we just succeed quickly.
  return ok({
    tool: 'create_booking',
    confirmation,
    window: when,
    message,
    received: payload
  });
}

async function handleQuoteEstimate(args: AnyObj) {
  // Minimal demo response with guardrails per knowledge base
  const task = coerceString(args.task || 'diagnostic');
  const estimate =
    task.toLowerCase() === 'maintenance'
      ? 'Maintenance tune-up typically $149–$249 (final price after technician diagnosis).'
      : task.toLowerCase() === 'install-estimate'
      ? 'Install estimates are free; in-home evaluation required.'
      : 'Diagnostic typically $89–$149 and credited toward repairs > $300 (final price after technician diagnosis).';
  return ok({ tool: 'quote_estimate', estimate, received: { task, ...args } });
}

async function handleHandoffSms(args: AnyObj) {
  // For demo, just say it’s queued. (Wire Twilio later if you want real SMS.)
  const phone = coerceString(args.phone);
  const message = coerceString(args.message || 'Thanks for calling. We’ll follow up shortly.');
  if (!phone && !DEMO_MODE) return bad('phone is required');
  return ok({ tool: 'handoff_sms', queued: true, received: { phone, message } });
}

async function handleTakePayment(args: AnyObj) {
  // Demo: return fake payment URL
  const amount = coerceString(args.amount_usd || args.amount || '');
  const payment_url = `https://pay.example.com/demo/${demoConfirmation()}`;
  return ok({ tool: 'take_payment', payment_url, received: { amount, ...args } });
}

async function handleUpdateCrmNote(args: AnyObj) {
  // Demo: pretend to persist a note
  const summary = coerceString(args.summary || 'Call summary');
  const priority = coerceString(args.priority || 'standard');
  return ok({ tool: 'update_crm_note', saved: true, received: { summary, priority } });
}

// ----- Router
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const started = nowIso();
  const { tool, args, headerSecret } = await parseRequest(req);

  // Soft-check secret; log but don’t block while you’re iterating
  const secretOk = !SHARED_SECRET || headerSecret === SHARED_SECRET;

  // Structured log for Vercel
  console.log('TOOL_CALL', {
    timestamp: started,
    toolName: tool,
    secretOk,
    args
  });

  // Route tool
  try {
    switch (tool) {
      case 'create_booking':
        return await handleCreateBooking(args);
      case 'quote_estimate':
        return await handleQuoteEstimate(args);
      case 'handoff_sms':
        return await handleHandoffSms(args);
      case 'take_payment':
        return await handleTakePayment(args);
      case 'update_crm_note':
        return await handleUpdateCrmNote(args);
      default:
        return bad('Unknown tool', { tool, args });
    }
  } catch (err: any) {
    console.error('TOOL_ERROR', { tool, error: err?.message, stack: err?.stack });
    // In demo, don’t ever blow up the call—fail soft.
    return DEMO_MODE
      ? ok({ tool, demo_error: true, message: 'Non-fatal tool error in demo; continuing.' })
      : bad('Unhandled tool error', { tool, message: err?.message });
  }
}
