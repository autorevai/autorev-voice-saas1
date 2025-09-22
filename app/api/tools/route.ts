// app/api/tools/route.ts
import { NextRequest, NextResponse } from 'next/server';

// --- Helpers
function json(data: any, init?: number | ResponseInit) {
  return NextResponse.json(data, init);
}
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-tool-name, x-shared-secret',
  };
}

// In-memory “holds” just so the assistant can confirm success
const holds: Array<{ id: string; payload: any }> = [];

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(req: NextRequest) {
  try {
    // CORS
    const headers = corsHeaders();

    // Shared secret
    const provided = req.headers.get('x-shared-secret') || '';
    const expected = process.env.WEBHOOK_SHARED_SECRET || '';
    if (!expected || provided !== expected) {
      return new NextResponse('Unauthorized', { status: 401, headers });
    }

    // Tool name
    const tool = (req.headers.get('x-tool-name') || '').toString().trim();
    if (!tool) {
      return new NextResponse('Missing x-tool-name header', { status: 400, headers });
    }

    // Payload (Vapi sometimes sends {input} or {args}—normalize)
    const body = await req.json().catch(() => ({}));
    const args = body?.args ?? body?.input ?? body;

    // Dispatch
    switch (tool) {
      case 'create_booking': {
        /**
         * Expected args (strings are fine):
         * job_type, requested_start (ISO8601), duration_minutes, name, phone,
         * email?, address, city?, state?, zip?, summary, equipment?, priority?
         */
        const id = `job_${Date.now()}`;
        holds.push({ id, payload: args });

        // Echo a success shape the prompt can read back
        return json(
          {
            ok: true,
            booking_id: id,
            window: args?.requested_start || null,
            priority: args?.priority || 'standard',
            message: 'Booked successfully (placeholder).',
          },
          { status: 200, headers }
        );
      }

      case 'handoff_sms': {
        // You can integrate Twilio here later; for now acknowledge.
        return json({ ok: true, sent: true }, { status: 200, headers });
      }

      case 'quote_estimate': {
        // Return example price bands
        return json(
          {
            ok: true,
            bands: {
              diagnostic: '$79–$149',
              maintenance: '$129–$249',
              common_repairs: {
                capacitor: '$120–$300',
                contactor: '$150–$350',
                blower_motor: '$450–$900',
                refrigerant_per_lb: '$80–$150',
                inducer_motor: '$600–$1,100',
              },
            },
            note: 'Ranges only until technician diagnosis.',
          },
          { status: 200, headers }
        );
      }

      case 'update_crm_note': {
        // args.summary (required), args.priority? ('standard'|'emergency')
        if (!args?.summary) {
          return new NextResponse('summary is required', { status: 400, headers });
        }
        // Save to DB or Supabase later; stub returns ok
        return json({ ok: true }, { status: 200, headers });
      }

      default:
        return new NextResponse(`Unknown tool: ${tool}`, { status: 400, headers });
    }
  } catch (err: any) {
    return json({ ok: false, error: err?.message || 'Unhandled error' }, { status: 500, headers: corsHeaders() });
  }
}
