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
  return expected ? got === expected : true;
}

// generate demo confirmation id
function makeConf() {
  const part = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `BK-${part}`;
}

// ---------- core unwrapping ----------
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
    ok: true,
    success: true,
    tool: "create_booking",
    status: "booked",
    confirmation,
    window,
    received: rec,
    result: { confirmation, window },
  };
}

function handleHandoffSms(args: any) {
  return {
    ok: true,
    success: true,
    tool: "handoff_sms",
    status: "sent",
    to: args?.phone ?? args?.to ?? "unknown",
    result: { sent: true },
  };
}

function handleUpdateCrm(args: any) {
  return {
    ok: true,
    success: true,
    tool: "update_crm_note",
    status: "saved",
    note: args?.summary ?? "(no summary)",
    priority: args?.priority ?? "standard",
    result: { saved: true },
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
            success: false,
            error: `Unknown tool "${toolName}". Set x-tool-name header or include {name/toolName} in body.`,
          },
          400
        );
    }
  } catch (e: any) {
    console.error("TOOL_ERROR", { toolName, err: e?.message || e });
    return withCors(
      { ok: false, success: false, tool: toolName, error: "handler_threw" },
      500
    );
  }

  const dt = Date.now() - t0;
  return withCors({ ...out, ms: dt }, 200);
}
