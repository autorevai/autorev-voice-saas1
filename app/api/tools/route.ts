/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "../../../lib/db";

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

// ---------- database persistence helpers ----------
function extractVapiCallId(req: NextRequest, payload: any): string | null {
  // Check headers first
  const headerCallId = req.headers.get('x-vapi-call-id');
  if (headerCallId) return headerCallId;
  
  // Check payload locations
  const payloadCallId = payload?.call?.id || payload?.message?.call?.id;
  if (payloadCallId) return payloadCallId;
  
  return null;
}

function determineCallOutcome(toolName: string, success: boolean): string {
  if (!success) return 'failed';
  
  switch (toolName) {
    case 'create_booking':
      return 'booked';
    case 'handoff_sms':
      return 'handoff';
    default:
      return 'unknown';
  }
}

// Priority order: booked > handoff > unknown > failed
function getOutcomePriority(outcome: string): number {
  switch (outcome) {
    case 'booked': return 4;
    case 'handoff': return 3;
    case 'unknown': return 2;
    case 'failed': return 1;
    default: return 0;
  }
}

function shouldUpdateOutcome(currentOutcome: string | null, newOutcome: string): boolean {
  if (!currentOutcome) return true; // No existing outcome, always update
  return getOutcomePriority(newOutcome) > getOutcomePriority(currentOutcome);
}

async function persistToolResult(
  vapiCallId: string | null,
  toolName: string,
  requestJson: any,
  responseJson: any,
  success: boolean
) {
  try {
    const db = createClient();
    const tenantId = process.env.DEMO_TENANT_ID;
    
    if (!tenantId) {
      console.warn("DB_PERSIST_WARN", { message: "No DEMO_TENANT_ID set, skipping persistence" });
      return;
    }

    if (!vapiCallId) {
      console.warn("DB_PERSIST_WARN", { message: "No VAPI call ID found, skipping persistence" });
      return;
    }

    const now = new Date().toISOString();
    const newOutcome = determineCallOutcome(toolName, success);

    // Check if call already exists to preserve existing outcome
    // Priority: booked > handoff > unknown > failed
    const { data: existingCall } = await db
      .from('calls')
      .select('outcome')
      .eq('vapi_call_id', vapiCallId)
      .single();

    // Only update outcome if new outcome has higher priority
    // This prevents "booked" from being overwritten by "handoff"
    const shouldUpdate = shouldUpdateOutcome(existingCall?.outcome, newOutcome);
    const finalOutcome = shouldUpdate ? newOutcome : existingCall?.outcome;

    // Upsert call record
    const { data: callData, error: callError } = await db
      .from('calls')
      .upsert({
        vapi_call_id: vapiCallId,
        tenant_id: tenantId,
        started_at: now,
        ended_at: now,
        outcome: finalOutcome,
        raw_json: requestJson
      }, {
        onConflict: 'vapi_call_id'
      })
      .select()
      .single();

    if (callError) {
      console.error("DB_CALL_ERROR", { error: callError, vapiCallId });
      return;
    }

    // Insert tool result
    const { error: toolError } = await db
      .from('tool_results')
      .insert({
        call_id: callData.id,
        tool_name: toolName,
        request_json: requestJson,
        response_json: responseJson,
        success: success
      });

    if (toolError) {
      console.error("DB_TOOL_RESULT_ERROR", { error: toolError, callId: callData.id });
    } else {
      console.info("DB_PERSIST_SUCCESS", { 
        callId: callData.id, 
        toolName, 
        success,
        outcome: finalOutcome,
        outcomeUpdated: shouldUpdate,
        previousOutcome: existingCall?.outcome
      });
    }

    // Update call with duration if this is the first tool result
    await updateCallDuration(db, callData.id, callData.started_at, now);

    return callData.id;
  } catch (error) {
    console.error("DB_PERSIST_ERROR", { error, toolName, vapiCallId });
  }
}

async function updateCallDuration(db: any, callId: string, startedAt: string, endedAt: string) {
  try {
    const startTime = new Date(startedAt).getTime();
    const endTime = new Date(endedAt).getTime();
    const durationSec = Math.floor((endTime - startTime) / 1000);

    const { error } = await db
      .from('calls')
      .update({
        ended_at: endedAt,
        duration_sec: durationSec
      })
      .eq('id', callId);

    if (error) {
      console.error("DB_DURATION_UPDATE_ERROR", { error, callId });
    } else {
      console.info("DB_DURATION_UPDATED", { callId, durationSec });
    }
  } catch (error) {
    console.error("DB_DURATION_CALC_ERROR", { error, callId });
  }
}

async function persistBooking(callId: string, bookingData: any) {
  try {
    const db = createClient();
    const tenantId = process.env.DEMO_TENANT_ID;
    
    if (!tenantId) {
      console.warn("DB_BOOKING_WARN", { message: "No DEMO_TENANT_ID set, skipping booking persistence" });
      return;
    }

    // Generate confirmation code (simple approach for now)
    const confirmation = Math.random().toString(36).substring(2, 10).toUpperCase();
    
    // Calculate start time (tomorrow 8 AM for demo)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const { error } = await db
      .from('bookings')
      .insert({
        tenant_id: tenantId,
        call_id: callId,
        confirmation: confirmation,
        window_text: "8 to 11 AM",
        start_ts: tomorrow.toISOString(),
        duration_min: parseInt(bookingData.duration_minutes) || 90,
        name: bookingData.name || "",
        phone: bookingData.phone || "",
        email: bookingData.email || null,
        address: bookingData.address || "",
        city: bookingData.city || null,
        state: bookingData.state || null,
        zip: bookingData.zip || null,
        summary: bookingData.summary || null,
        equipment: bookingData.equipment || null,
        priority: bookingData.priority || "standard",
        source: "voice_call"
      });

    if (error) {
      console.error("DB_BOOKING_ERROR", { error, callId });
    } else {
      console.info("DB_BOOKING_SUCCESS", { callId, confirmation });
    }
  } catch (error) {
    console.error("DB_BOOKING_PERSIST_ERROR", { error, callId });
  }
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
    customerPhone: args?.phone,
    rawArgs: args,
    argsKeys: Object.keys(args || {})
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
    // Always use "to" in windows so TTS never says "dash" or merges numbers
    const windowStr = args?.window || "8 to 11";
    
    console.info("BOOKING_SUCCESS", { 
      customer: rec.name,
      phone: rec.phone,
      address: rec.address
    });
    
    return {
      success: true,                 // <- explicit success flag
      status: "booked",              // <- second success indicator
      window: windowStr,             // <- human-readable window for the script below

      // The exact sentence you want the agent to speak:
      say: `You're all set. We'll see you ${windowStr}.`,

      // Hard stop signal. The agent should end after speaking 'say'.
      end_conversation: true,

      // Optional logging—keep anything else you already send:
      tool: "create_booking",
      received: rec
    };
  }

  // Failure case: no customer data
  console.error("BOOKING_FAILED_NO_DATA", { received: rec });
  return {
    success: false,
    error: "slot_unavailable",
    say: "I'm sorry, I didn't catch all your information. Could you repeat your name and address?",
    tool: "create_booking",
    received: rec
  };
}

function handleQuoteEstimate(args: any) {
  console.info("QUOTE_ESTIMATE_DEBUG", {
    rawArgs: args,
    argsKeys: Object.keys(args || {}),
    hasTask: Boolean(args?.task),
    hasEquipment: Boolean(args?.equipment),
    hasNotes: Boolean(args?.notes),
    taskValue: args?.task
  });

  const task = args?.task || "diagnostic";
  const equipment = args?.equipment || "unknown";
  const notes = args?.notes || "";
  
  // CRITICAL: Use "to" not hyphens for TTS
  let priceRange = "$89 to $129";
  let details = "diagnostic service";

  switch (task) {
    case "diagnostic":
      priceRange = "$89 to $129";
      details = "diagnostic service (credited toward repair)";
      break;
    case "maintenance":
      priceRange = "$150 to $250";
      details = "maintenance tune-up";
      break;
    case "capacitor":
      priceRange = "$150 to $350";
      details = "capacitor replacement";
      break;
    case "contactor":
      priceRange = "$170 to $380";
      details = "contactor replacement";
      break;
    case "blower-motor":
      priceRange = "$450 to $900";
      details = "blower motor replacement";
      break;
    case "refrigerant-per-lb":
      priceRange = "$80 to $150 per pound";
      details = "refrigerant service";
      break;
    case "inducer-motor":
      priceRange = "$650 to $1,200";
      details = "inducer motor replacement";
      break;
    case "install-estimate":
      priceRange = "$3,000 to $8,000 plus";
      details = "system replacement (varies by size and efficiency)";
      break;
    default:
      priceRange = "$150 to $800";
      details = "diagnostic and repair";
  }

  console.info("QUOTE_ESTIMATE_SUCCESS", {
    task: task,
    priceRange: priceRange,
    details: details
  });

  return {
    success: true,
    status: "provided",
    task: task,
    price_range: priceRange,
    service_type: details,
    equipment: equipment,
    notes: notes,
    
    // The exact sentence you want the agent to speak:
    say: `That typically runs ${priceRange}. This is a range until diagnosis.`,
    
    tool: "quote_estimate",
    diagnostic_info: task === "diagnostic" ? "Fee credited toward approved repair" : null,
    estimate_disclaimer: "Range estimate until technician diagnoses the system"
  };
}

function handleHandoffSms(args: any) {
  console.info("HANDOFF_SMS_DEBUG", {
    rawArgs: args,
    argsKeys: Object.keys(args || {}),
    hasPhone: Boolean(args?.phone),
    hasMessage: Boolean(args?.message),
    phoneValue: args?.phone,
    messageValue: args?.message
  });

  const phone = args?.phone || "unknown";
  const message = args?.message || "Follow-up assistance requested";
  
  // Validate E.164 phone format (basic check)
  const isValidPhone = phone.startsWith('+') && phone.length >= 10;
  if (!isValidPhone && phone !== "unknown") {
    console.warn("HANDOFF_SMS_INVALID_PHONE", { phone, isValidPhone });
  }

  console.info("HANDOFF_SMS_SUCCESS", {
    phone: phone,
    message: message,
    isValidPhone: isValidPhone
  });

  return {
    success: true,
    status: "sent",
    phone: phone,
    message: message,
    
    // The exact sentence you want the agent to speak:
    say: "I'll have our team reach out to you shortly with more details.",
    
    tool: "handoff_sms",
    sms_type: "handoff_request",
    note: `Handoff SMS queued for ${phone}: ${message}`
  };
}

function handleUpdateCrm(args: any) {
  console.info("UPDATE_CRM_DEBUG", {
    rawArgs: args,
    argsKeys: Object.keys(args || {}),
    hasSummary: Boolean(args?.summary),
    hasPriority: Boolean(args?.priority)
  });

  const note = args?.summary ?? args?.note ?? args?.call_summary ?? "(no summary)";
  const priority = args?.priority ?? "standard";
  const customerName = args?.name ?? args?.customer_name ?? "";
  const phone = args?.phone ?? "";
  
  console.info("UPDATE_CRM_SUCCESS", {
    customer: customerName,
    priority: priority,
    noteLength: note.length
  });

  return {
    success: true,
    tool: "update_crm_note",
    status: "saved",
    customer: customerName,
    phone: phone,
    note: note,
    priority: priority,
    message: `CRM note saved for ${customerName || phone} (${priority})`
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

  // Input log (expanded to include new tool fields)
  console.info("TOOL_CALL_IN", {
    ts: new Date().toISOString(),
    toolName,
    secretOk,
    argsPreview: preview(args, ["name", "phone", "zip", "task", "message", "summary"]),
    hasMessageEnvelope: Boolean(payload?.message),
  });

  // Route to handler
  let result: any;
  try {
    switch (toolName) {
      case "create_booking":
        result = handleCreateBooking(args);
        break;
      case "quote_estimate":
        result = handleQuoteEstimate(args);
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
            error: `Unknown tool "${toolName}". Available tools: create_booking, quote_estimate, handoff_sms, update_crm_note`,
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

  // Database persistence (non-blocking side effect)
  try {
    const vapiCallId = extractVapiCallId(req, payload);
    const callId = await persistToolResult(
      vapiCallId,
      toolName,
      args,
      responseBody,
      result.success || false
    );

    // If create_booking was successful, also persist the booking
    if (toolName === "create_booking" && result.success && callId) {
      await persistBooking(callId, result.received || {});
    }
  } catch (error) {
    // Log but don't fail the request
    console.error("DB_PERSIST_SIDE_EFFECT_ERROR", { error, toolName });
  }

  return withCors(responseBody, 200);
}
