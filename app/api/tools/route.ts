/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

/* ----------------------- helpers ----------------------- */
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, x-shared-secret, x-tool-name, x-vapi-signature",
  };
}

function withCors(body: any, status = 200) {
  return new NextResponse(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders() },
  });
}

// tiny logger-safe preview of args
function preview(obj: any, keys: string[] = []) {
  if (!obj || typeof obj !== "object") return obj;
  const out: Record<string, any> = {};
  const use = keys.length ? keys : Object.keys(obj);
  for (const k of use) {
    const v = (obj as any)[k];
    out[k] = typeof v === "object" ? "[object]" : v;
  }
  return out;
}

// constant-time style equality for secrets (simple)
function secretsEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
function confirmSecret(req: NextRequest) {
  const expected = process.env.WEBHOOK_SHARED_SECRET ?? "";
  const got = req.headers.get("x-shared-secret") ?? "";
  if (!expected) return true; // no secret configured → allow
  return got && secretsEqual(expected, got);
}

function makeConf() {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK-${part}`;
}

/* ----------------- Vapi/TestTool unwrapping -------------- */
// Accepts Vapi's envelope OR a direct { name/toolName, args/input } body.
function unwrapToolCall(payload: any): { toolName: string; args: any } {
  const bodyName =
    payload?.toolName || payload?.name || payload?.tool || payload?.tool_name;

  const directArgs =
    payload?.args ??
    payload?.input ??
    payload?.payload ??
    (typeof payload === "object" ? payload : undefined);

  const msg = payload?.message ?? payload?.artifact ?? payload?.call?.message;

  const toolCalls = msg?.toolCalls ?? msg?.tool_call ?? [];
  const toolCallList = msg?.toolCallList ?? [];
  const toolWithToolCallList = msg?.toolWithToolCallList ?? [];

  let vapiName = "";
  let vapiArgs: any = undefined;

  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const first = toolCalls[0];
    vapiName = first?.name || first?.toolName || "";
    vapiArgs = first?.args ?? first?.input ?? {};
  } else if (Array.isArray(toolCallList) && toolCallList.length > 0) {
    const first = toolCallList[0];
    vapiName = first?.name || first?.toolName || "";
    vapiArgs = first?.args ?? first?.input ?? {};
  } else if (
    Array.isArray(toolWithToolCallList) &&
    toolWithToolCallList.length > 0
  ) {
    const first = toolWithToolCallList[0]?.toolCall ?? {};
    vapiName = first?.name || first?.toolName || "";
    vapiArgs = first?.args ?? first?.input ?? {};
  }

  return {
    toolName: bodyName || vapiName || "",
    args: directArgs || vapiArgs || {},
  };
}

/* ---------------------- handlers ------------------------- */
// We always return success for the demo so the LLM has a clear signal.
// Also include a plain-English `content` so the model parrots the confirmation.
function handleCreateBooking(args: any) {
  const rec = {
    job_type: args?.job_type ?? "diagnostic",
    requested_start: args?.requested_start ?? "",
    duration_minutes:
      typeof args?.duration_minutes === "string"
        ? args?.duration_minutes
        : args?.duration_minutes ?? "90",
    name: args?.name ?? "",
    phone: args?.phone ?? "",
    email: args?.email ?? "",
    address: args?.address ?? "",
    city: args?.city ?? "",
    state: args?.state ?? "",
    zip: args?.zip ?? "",
    summary: args?.summary ?? "",
    equipment: args?.equipment ?? "",
    priority: args?.priority ?? "standard",
  };

  const confirmation = makeConf();
  const window = "8–11 AM";

  return {
    success: true,               // <— explicit success flag
    ok: true,
    tool: "create_booking",
    status: "booked",
    confirmation,
    window,
    received: rec,
    // Text for the LLM to read back
    content: `Booking confirmed for ${rec.name || "the customer"} ${window}. Confirmation ${confirmation}.`,
  };
}

function handleHandoffSms(args: any) {
  const to = args?.phone ?? args?.to ?? "unknown";
  return {
    success: true,
    ok: true,
    tool: "handoff_sms",
    status: "sent",
    to,
    content: `Sent follow-up text to ${to}.`,
  };
}

function handleUpdateCrm(args: any) {
  return {
    success: true,
    ok: true,
    tool: "update_crm_note",
    status: "saved",
    note: args?.summary ?? "(no summary)",
    priority: args?.priority ?? "standard",
    content: `Saved CRM note (${args?.priority ?? "standard"}).`,
  };
}

/* ---------------- HTTP methods (edge) -------------------- */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET() {
  return withCors({ ok: true, route: "/api/tools", health: "ok" }, 200);
}

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  const secretOk = confirmSecret(req);
  const headerTool = (req.headers.get("x-tool-name") || "").toString();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  const { toolName: bodyTool, args } = unwrapToolCall(payload);
  const toolName = (headerTool || bodyTool || "").toString();

  console.info("TOOL_CALL", {
    timestamp: new Date().toISOString(),
    toolName,
    secretOk,
    argsPreview: preview(args, ["name", "phone", "zip", "job_type"]),
    rawPreview: payload?.message ? ["message"] : Object.keys(payload || {}),
  });

  try {
    let out: any;
    switch (toolName) {
      case "create_booking":
        out = handleCreateBooking(args);
        break;
      case "handoff_sms":
        out = handleHandoffSms(args);
        break;
      case "update_crm_note":
        out = handleUpdateCrm(args);
        break;
      default:
        return withCors(
          {
            success: false,
            ok: false,
            error: `Unknown tool "${toolName}". Set x-tool-name header or include {name/toolName} in body.`,
          },
          400
        );
    }
    const ms = Date.now() - t0;
    return withCors({ ...out, ms }, 200);
  } catch (e: any) {
    console.error("TOOL_ERROR", { toolName, err: e?.message || e });
    return withCors({ success: false, ok: false, tool: toolName }, 500);
  }
}
