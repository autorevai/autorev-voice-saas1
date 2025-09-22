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
const DEMO_MODE = (env('DEMO_MODE', 'true').toLowerCase() === 'true');
const SHARED_SECRET = env('WEBHOOK_SHARED_SECRET', '');

// ----- Parse request (supports both Test Tool + live-call envelope)
async function parseRequest(req: NextRequest) {
  const headerTool = (req.headers.get('x-tool-name') ?? '').toString().trim();
  const headerSecret = (req.headers.get('x-shared-secret') ?? '').toString().trim();

  let body: AnyObj = {};
  try { body = (await req.json()) ?? {}; } catch {}

  // Body may be: { name/toolName, args/input }  OR  { message: { toolCalls: [...] } }
  const bodyTool = (body.toolName || body.name || '').toString().trim();

  // Prefer raw args if present
  let args: AnyObj =
    (typeof body.args === 'object' && body.args) ||
    (typeof body.input === 'object' && body.input) ||
    (body && typeof body === 'object' ? body : {});

  // If this is a live-call envelope, unwrap the first tool's args
  if (args.message && typeof args.message === 'object') {
    const m = args.message;
    const fromList =
      (Array.isArray(m.toolCalls) && m.toolCalls[0]?.args) ||
      (Array.isArray(m.toolCallList) && m.toolCallList[0]?.args) ||
      (Array.isArray(m.toolWithToolCallList) && m.toolWithToolCallList[0]?.toolCall?.args);
    if (fromList && typeof fromList === 'object') {
      args = fromList;
    }
  }

  const tool: ToolName = (headerTool || bodyTool) as ToolName;
  return { tool, args, headerSecret, rawBody: body };
}

// ----- Demo helpers
function demoConfirmation() {
  const rnd = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `BK-${rnd}`;
}
function nowIso() { return new Date().toISOString(); }
function s(x: any, fallback = '') { return (x === undefined || x === null) ? fallback : String(x); }
function pickWindow(iso?: string) {
  try {
    if (iso) {
      const h = new Date(iso).getHours();
      if (h < 11) return '8–11 AM';
      if (h < 14) return '11–2 PM';
      return '2–5 PM';
    }
  } catch {}
  return '8–11 AM';
}

// ----- Tool handlers
async function handleCreateBooking(args: AnyObj) {
  const payload = {
    job_type: s(args.job_type || args.type || 'diagnostic'),
    requested_start: s(args.requested_start),
    duration_minutes: s(args.duration_minutes || '90'),
    name: s(args.name),
    phone: s(args.phone),
    email: s(args.email),
    address: s(args.address),
    city: s(args.city),
    state: s(args.state),
    zip: s(args.zip),
    summary: s(args.summary),
    equipment: s(args.equipment),
    priority: s(args.priority || 'standard')
  };

  const missing: string[] = [];
  for (const k of ['name', 'phone', 'address', 'zip']) if (!payload[k as keyof typeof payload]) missing.push(k);
  if (missing.length && !DEMO_MODE) return bad('Missing required fields', { missing, received: payload });

  // Demo: always "book"
  const confirmation = demoConfirmation();
  const window = pickWindow(payload.requested_start);
  return ok({
    tool: 'create_booking',
    status: 'booked',
    confirmation,
    window,
    received: payload,
    agent_hint: `CONFIRMED ${window}. Confirmation ID ${confirmation}.`
  });
}

async function handleQuoteEstimate(args: AnyObj) {
  const task = s(args.task || 'diagnostic');
  const estimate =
    task.toLowerCase() === 'maintenance'
      ? 'Maintenance tune-up typically $149–$249 (final price after technician diagnosis).'
      : task.toLowerCase() === 'install-estimate'
      ? 'Install estimates are free; in-home evaluation required.'
      : 'Diagnostic typically $89–$149 and credited toward repairs > $300 (final price after technician diagnosis).';
  return ok({ tool: 'quote_estimate', estimate, received: { task, ...args } });
}

async function handleHandoffSms(args: AnyObj) {
  const phone = s(args.phone);
  const message = s(args.message || 'Thanks for calling. We’ll follow up shortly.');
  if (!phone && !DEMO_MODE) return bad('phone is required');
  return ok({ tool: 'handoff_sms', queued: true, received: { phone, message } });
}

async function handleTakePayment(args: AnyObj) {
  const amount = s(args.amount_usd || args.amount || '');
  const payment_url = `https://pay.example.com/demo/${demoConfirmation()}`;
  return ok({ tool: 'take_payment', payment_url, received: { amount, ...args } });
}

async function handleUpdateCrmNote(args: AnyObj) {
  const summary = s(args.summary || 'Call summary');
  const priority = s(args.priority || 'standard');
  return ok({ tool: 'update_crm_note', saved: true, received: { summary, priority } });
}

// ----- Router
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  const started = nowIso();
  const { tool, args, headerSecret, rawBody } = await parseRequest(req);
  const secretOk = !SHARED_SECRET || headerSecret === SHARED_SECRET;

  console.log('TOOL_CALL', { timestamp: started, toolName: tool, secretOk, argsPreview: args, rawPreview: Object.keys(rawBody ?? {}).slice(0,3) });

  try {
    switch (tool) {
      case 'create_booking': return await handleCreateBooking(args);
      case 'quote_estimate': return await handleQuoteEstimate(args);
      case 'handoff_sms': return await handleHandoffSms(args);
      case 'take_payment': return await handleTakePayment(args);
      case 'update_crm_note': return await handleUpdateCrmNote(args);
      default: return bad('Unknown tool', { tool, args });
    }
  } catch (err: any) {
    console.error('TOOL_ERROR', { tool, error: err?.message, stack: err?.stack });
    return DEMO_MODE
      ? ok({ tool, demo_error: true, message: 'Non-fatal tool error in demo; continuing.' })
      : bad('Unhandled tool error', { tool, message: err?.message });
  }
}
