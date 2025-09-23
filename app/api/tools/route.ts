/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// ---------- helpers ----------
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
    headers: {
      "content-type": "application/json",
      ...corsHeaders(),
    },
  });
}

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

function confirmSecret(req: NextRequest) {
  const expected = process.env.WEBHOOK_SHARED_SECRET ?? "";
  const got = req.headers.get("x-shared-secret") ?? "";
  // Allow if no secret set; otherwise require exact match
  return expected ? got === expected : true;
}

function makeConf() {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK-${part}`;
}

// ---------- core unwrapping ----------
// Accept Vapi envelope OR a plain {name|toolName|tool, args|input|payload}
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

// ---------- demo handlers ----------
function handleCreateBooking(args: any) {
  // DEBUG: Log exactly what VAPI is sending
  console.info("CREATE_BOOKING_DEBUG", {
    rawArgs: args,
    argsKeys: Object.keys(args || {}),
    argsEntries: Object.entries(args || {}),
    hasData: Boolean(args?.name || args?.phone || args?.address)
  });

  const rec = {
    job_type: args?.job_type ?? "diagnostic",
    requested_start: args?.requested_start ?? "",
    duration_minutes: args?.duration_minutes ?? "90",
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

  // FAIL if no actual customer data received
  if (!args?.name && !args?.phone && !args?.address) {
    console.error("CREATE_BOOKING_NO_DATA", { received: rec });
    return {
      success: false,
      tool: "create_booking",
      status: "failed", 
      error: "No customer data received from VAPI",
      received: rec
    };
  }

  const confirmation = makeConf();
  return {
    success: true,
    tool: "create_booking",
    status: "booked",
    confirmation,
    window: "8 to 11 AM",
    received: rec,
  };
}

function handleHandoffSms(args: any) {
  const to = args?.phone ?? args?.to ?? "unknown";
  return {
    ok: true,
    success: true,
    tool: "handoff_sms",
    status: "sent",
    to,
    message: `Text sent to ${to}.`,
  };
}

function handleUpdateCrm(args: any) {
  const note = args?.summary ?? "(no summary)";
  const priority = args?.priority ?? "standard";
  return {
    ok: true,
    success: true,
    tool: "update_crm_note",
    status: "saved",
    note,
    priority,
    message: `Saved note (${priority}).`,
  };
}

// ---------- HTTP handlers ----------
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

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    /* noop */
  }

  const { toolName: bodyTool, args } = unwrapToolCall(payload);
  const toolName = (headerTool || bodyTool || "").toString();

  // Input log (short)
  console.info("TOOL_CALL_IN", {
    ts: new Date().toISOString(),
    toolName,
    secretOk,
    argsPreview: preview(args, ["name", "phone", "zip", "job_type"]),
    hasMessageEnvelope: Boolean(payload?.message),
  });

  // Route to handler
  let result: any;
  try {
    switch (toolName) {
      case "create_booking":
        result = handleCreateBooking(args);
        break;
      case "handoff_sms":
        result = handleHandoffSms(args);
        break;
      case "update_crm_note":
        result = handleUpdateCrm(args);
        break;
      default:
        return withCors(
          {
            ok: false,
            success: false,
            error: `Unknown tool "${toolName}". Set x-tool-name header or include {name/toolName} in body.`,
          },
          400
        );
    }
  } catch (e: any) {
    console.error("TOOL_CALL_ERR", { toolName, err: e?.message || e });
    return withCors(
      { ok: false, success: false, tool: toolName, error: "handler_threw" },
      500
    );
  }

  const ms = Date.now() - t0;
  const responseBody = { ...result, ms };

  // Output log (exact body we return)
  console.info("TOOL_CALL_OUT", {
    ts: new Date().toISOString(),
    toolName,
    response: responseBody,
  });

  return withCors(responseBody, 200);
}
