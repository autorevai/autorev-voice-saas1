// app/api/tools/route.ts
import { NextRequest, NextResponse } from "next/server";

// Vapi can send the tool name via header (preferred) or in the body.
// We keep this very permissive so it never crashes.
type ToolBody = {
  toolName?: string;
  name?: string;
  input?: any;
  args?: any;
  [k: string]: any;
};

export async function POST(req: NextRequest) {
  let body: ToolBody = {};
  try {
    body = (await req.json()) as ToolBody;
  } catch {
    body = {};
  }

  const headerTool = req.headers.get("x-tool-name") || "";
  const bodyTool = body.toolName || body.name || "";
  const toolName = (headerTool || bodyTool || "").toString();

  // Vapi sometimes puts args in body.args or body.input or directly in body
  const args = (body.args ?? body.input ?? body) as any;

  switch (toolName) {
    case "create_booking": {
      // Simulate a successful booking so the agent can confirm aloud.
      const bookingId = "bk_" + Math.random().toString(36).slice(2, 10);
      const startISO =
        typeof args?.requested_start === "string"
          ? args.requested_start
          : new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // tomorrow as a fallback

      const window = args?.window || "8–11"; // keep it simple for now

      const booking = {
        id: bookingId,
        job_type: args?.job_type || "diagnostic",
        start: startISO,
        window,
        name: args?.name,
        phone: args?.phone,
        email: args?.email,
        address: args?.address,
        city: args?.city,
        state: args?.state,
        zip: args?.zip,
        summary: args?.summary,
        equipment: args?.equipment,
        priority: args?.priority || "standard",
      };

      return NextResponse.json({ ok: true, booking });
    }

    case "quote_estimate": {
      // Simple bands; the agent will phrase as “range estimate until diagnosis.”
      const estimates = {
        diagnostic: { low: 79, high: 149 },
        maintenance: { low: 169, high: 289 },
        capacitor: { low: 150, high: 350 },
        blower_motor: { low: 600, high: 1200 },
        refrigerant_per_lb: { low: 90, high: 150 },
        inducer_motor: { low: 750, high: 1400 },
      };
      return NextResponse.json({ ok: true, estimates });
    }

    case "handoff_sms": {
      // We’re not sending real SMS here; just acknowledge so the agent proceeds.
      // (You can later wire Twilio or Vapi SMS and still return ok: true.)
      return NextResponse.json({
        ok: true,
        sent: true,
        note: "stubbed handoff_sms acknowledged",
      });
    }

    case "take_payment": {
      // Stub a secure checkout link
      const link =
        "https://pay.example.com/checkout/" +
        Math.random().toString(36).slice(2, 10);
      return NextResponse.json({
        ok: true,
        payment_link: link,
        expires_in_sec: 900,
      });
    }

    default:
      return NextResponse.json(
        { ok: false, error: "unknown_tool", detail: toolName || "(none)" },
        { status: 400 }
      );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
