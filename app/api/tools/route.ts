/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

// ---------- helpers ----------
function json(data: any, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

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
  // keep logs small; only show listed top-level keys if provided
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
  return expected && got && expected === expected && got === expected
    ? true
    : expected ? got === expected : true; // if no secret configured, allow
}

// generate demo confirmation id
function makeConf() {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK-${part}`;
}

// ---------- core unwrapping ----------
// Accepts the Vapi envelope OR a plain {name,input|args} body from the Test Tool
function unwrapToolCall(payload: any): { toolName: string; args: any } {
  // Header takes precedence for tool name
  const bodyName =
    payload?.toolName || payload?.name || payload?.tool || payload?.tool_name;

  // Direct args (Test Tool / custom clients)
  const directArgs =
    payload?.args ??
    payload?.input ??
    payload?.payload ??
    (typeof payload === "object" ? payload : undefined);

  // Vapi envelope patterns
  const msg = payload?.message ?? payload?.artifact ?? payload?.call?.message;

  // Gather potential toolCall containers
  const toolCalls =
    msg?.toolCalls ??
    msg?.tool_call ??
    [];
  const toolCallList = msg?.toolCallList ?? [];
  const toolWithToolCallList = msg?.toolWithToolCallList ?? [];

  let vapiName = "";
  let vapiArgs: any = undefined;

  // Try modern toolCalls array first
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
  // Accept fields if present; fall back to safe defaults
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

  // Always “book” for demo
  return {
    ok: true,
    tool: "create_booking",
    status: "booked",
    confirmation: makeConf(),
    window: "8–11 AM",
    received: rec,
  };
}

function handleHandoffSms(args: any) {
  return {
    ok: true,
    tool: "handoff_sms",
    status: "sent",
    to: args?.phone ?? args?.to ?? "unknown",
  };
}

function handleUpdateCrm(args: any) {
  return {
    ok: true,
    tool: "update_crm_note",
    status: "saved",
    note: args?.summary ?? "(no summary)",
    priority: args?.priority ?? "standard",
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

  // Secret (optional but recommended)
  const secretOk = confirmSecret(req);

  // Prefer header for tool name
  const headerTool = (req.headers.get("x-tool-name") || "").toString();

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    payload = {};
  }

  // Unwrap
  const { toolName: bodyTool, args } = unwrapToolCall(payload);
  const toolName = (headerTool || bodyTool || "").toString();

  // Small log line in Vercel
  console.info("TOOL_CALL", {
    timestamp: new Date().toISOString(),
    toolName,
    secretOk,
    argsPreview: preview(args, ["name", "phone", "zip", "job_type"]),
    rawPreview: payload?.message ? ["message"] : Object.keys(payload || {}),
  });

  // Route tool
  let out: any;
  try {
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
            ok: false,
            error: `Unknown tool "${toolName}". Set x-tool-name header or include {name/toolName} in body.`,
          },
          400
        );
    }
  } catch (e: any) {
    console.error("TOOL_ERROR", {
      toolName,
      err: e?.message || e,
    });
    return withCors(
      { ok: false, tool: toolName, error: "handler_threw" },
      500
    );
  }

  const dt = Date.now() - t0;
  return withCors({ ...out, ms: dt }, 200);
}
