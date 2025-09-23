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

// ---------- enhanced unwrapping ----------
// Handles VAPI's complex nested envelope structure
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

  // Enhanced extraction from VAPI arrays - try all possible locations
  if (Array.isArray(toolCalls) && toolCalls.length > 0) {
    const first = toolCalls[0];
    vapiName = first?.name || first?.toolName || first?.function?.name || "";
    vapiArgs = first?.args ?? first?.input ?? first?.arguments ?? first?.function?.arguments ?? {};
    
    // Handle stringified JSON arguments
    if (typeof vapiArgs === "string") {
      try {
        vapiArgs = JSON.parse(vapiArgs);
      } catch {
        // Keep as string if not valid JSON
      }
    }
  } else if (Array.isArray(toolCallList) && toolCallList.length > 0) {
    const first = toolCallList[0];
    vapiName = first?.name || first?.toolName || first?.function?.name || "";
    vapiArgs = first?.args ?? first?.input ?? first?.arguments ?? first?.function?.arguments ?? {};
    
    if (typeof vapiArgs === "string") {
      try {
        vapiArgs = JSON.parse(vapiArgs);
      } catch {
        // Keep as string if not valid JSON
      }
    }
  } else if (Array.isArray(toolWithToolCallList) && toolWithToolCallList.length > 0) {
    const toolCallObj = toolWithToolCallList[0]?.toolCall ?? {};
    vapiName = toolCallObj?.name || toolCallObj?.toolName || toolCallObj?.function?.name || "";
    vapiArgs = toolCallObj?.args ?? toolCallObj?.input ?? toolCallObj?.arguments ?? toolCallObj?.function?.arguments ?? {};
    
    if (typeof vapiArgs === "string") {
      try {
        vapiArgs = JSON.parse(vapiArgs);
      } catch {
        // Keep as string if not valid JSON
      }
    }
  }

  // Debug log to see what we extracted
  if (vapiArgs && Object.keys(vapiArgs).length > 0) {
    console.info("EXTRACTED_ARGS", {
      toolName: bodyName || vapiName || "",
      extractedArgs: vapiArgs,
      source: toolCalls.length > 0 ? "toolCalls" : 
              toolCallList.length > 0 ? "toolCallList" : 
              toolWithToolCallList.length > 0 ? "toolWithToolCallList" : "direct"
    });
  }

  // CRITICAL FIX: Use extracted args if they exist and have data, otherwise fall back to direct args
  let finalArgs = {};
  
  if (vapiArgs && Object.keys(vapiArgs).length > 0) {
    finalArgs = vapiArgs;
    console.info("USING_EXTRACTED_ARGS", { count: Object.keys(vapiArgs).length });
  } else if (directArgs && typeof directArgs === 'object' && !directArgs.message) {
    finalArgs = directArgs;
    console.info("USING_DIRECT_ARGS", { count: Object.keys(directArgs).length });
  }

  return {
    toolName: bodyName || vapiName || "",
    args: finalArgs,
  };
}

// ---------- demo handlers ----------
function handleCreateBooking(args: any) {
  console.info("CREATE_BOOKING_DEBUG", {
    hasData: Boolean(args?.name || args?.phone || args?.address),
    customerName: args?.name,
    customerPhone: args?.phone
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

  // Success case: we have customer data
  if (args?.name || args?.phone || args?.address) {
    console.info("BOOKING_SUCCESS", { 
      customer: rec.name,
      phone: rec.phone,
      address: rec.address
    });
    
    return {
      success: true,
      tool: "create_booking",
      status: "booked",
      window: "8 to 11 AM",
      message: "Successfully booked for 8 to 11 AM tomorrow",
      received: rec,
    };
  }

  // Failure case: no customer data
  console.error("BOOKING_FAILED_NO_DATA", { received: rec });
  return {
    success: false,
    tool: "create_booking",
    status: "failed", 
    error: "No customer data received",
    received: rec
  };
}

function handleHandoffSms(args: any) {
  const to = args?.phone ?? args?.to ?? "unknown";
  return {
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
            success: false,
            error: `Unknown tool "${toolName}". Set x-tool-name header or include {name/toolName} in body.`,
          },
          400
        );
    }
  } catch (e: any) {
    console.error("TOOL_CALL_ERR", { toolName, err: e?.message || e });
    return withCors(
      { success: false, tool: toolName, error: "handler_threw" },
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
