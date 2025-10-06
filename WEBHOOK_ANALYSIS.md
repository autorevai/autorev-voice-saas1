# Webhook Implementation Analysis

## Executive Summary

After reviewing VAPI and Vercel documentation, our webhook implementation has **critical security gaps** and **incorrect payload parsing** that explains the errors you're seeing.

---

## Critical Issues Found

### 🚨 1. NO WEBHOOK AUTHENTICATION
**Location**: `app/api/vapi/webhook/route.ts`

**Problem**: The VAPI webhook endpoint has ZERO authentication. Any malicious actor can send fake webhooks.

**Evidence**:
- Tools route (`app/api/tools/route.ts`) has `authorized()` function checking `x-shared-secret` header
- Webhook route has NO auth check at all
- According to VAPI docs, webhooks should use Bearer token, OAuth, or HMAC authentication

**Impact**: CRITICAL - Security vulnerability and potential data corruption

---

### 🔴 2. INCORRECT WEBHOOK PAYLOAD STRUCTURE

**Problem**: We're not following VAPI's documented webhook structure.

**VAPI Documentation Says**:
```json
{
  "message": {
    "type": "assistant-request",
    "call": { /* Call Object */ }
  }
}
```

**What We're Doing**:
```typescript
const event = JSON.parse(rawBody);
const message = event?.message || event;  // ← Fallback pattern is wrong
```

**Why This Fails**:
- We're treating `event` and `message` as interchangeable
- VAPI always sends `{ message: { type, call } }` structure
- Our fallback logic masks parsing errors instead of failing fast

---

### ⚠️ 3. MISSING EVENT TYPE HANDLING

**VAPI Sends 19+ Event Types**:
1. `assistant-request` - Call started
2. `tool-calls` - Tool invocation
3. `status-update` - Call status changed
4. `end-of-call-report` - Call completed
5. `hang` - Call hung up
6. `conversation-update` - Real-time conversation
7. `transcript` - Transcript chunks
8. `speech-update` - Speech recognition updates
9. ... (11 more types)

**What We Handle**:
- `assistant-request`
- `end-of-call-report`
- That's it. We ignore 17 other event types.

**Impact**: We're missing real-time call updates, tool call confirmations, and status changes.

---

### ⚠️ 4. CUSTOMER PHONE NUMBER NOT ACCESSIBLE TO AI

**VAPI Documentation** (from inbound-support example):
> The caller's phone number is available in `call.customer.number`

**BUT**: This is only in the webhook payload, NOT in the AI's context during the call.

**What This Means**:
- The AI assistant cannot access caller ID during the conversation
- Template variables like `{{customer.number}}` don't work in tool calls
- We correctly fixed this by asking the customer for their phone number

**Current Status**: ✅ FIXED (we now ask for phone explicitly)

---

### 🟡 5. NO RESPONSE REQUIRED FOR MOST EVENTS

**VAPI Documentation**:
> Only specific events require responses (assistant-request, tool-calls, transfer-destination-request)

**What We Do**:
```typescript
return NextResponse.json({ received: true, requestId }, { status: 200 });
```

**Problem**: We return the same response for ALL events, even those that shouldn't respond.

**Impact**: Minor - but could cause issues with event processing

---

### 🟡 6. NO WEBHOOK TIMEOUT HANDLING

**VAPI Documentation**:
> 7.5-second response time limit for critical webhooks

**Vercel Documentation**:
> Serverless functions timeout after 10 seconds (Hobby), 60s (Pro), 300s (Enterprise)

**What We Do**:
- Database lookups (tenant detection)
- Database inserts (call records)
- No timeout protection or async processing

**Impact**: If database is slow, VAPI will timeout and retry, causing duplicate records

---

## Logs You're Seeing Explained

### "VAPI WEBHOOK WARN"
```
log.warn('Using demo tenant as fallback')
```
**Cause**: Tenant detection failed (assistant ID or phone number not found in database)

### "VAPI WEBHOOK INFO"
```
log.info('Received webhook', { ... })
```
**Cause**: Normal logging - this is fine

### "TENANT DETECTED"
```
console.log('🏢 TENANT DETECTED:', tenantId)
```
**Cause**: Successfully found tenant - this is GOOD

### Missing: "DB CALL CREATED" or "DB CALL INSERT FAILED"
**Cause**: If you don't see these, the call record isn't being saved

---

## Root Causes of Current Errors

Based on your test, likely errors:

1. **Database Constraint Error**: ✅ FIXED (we changed `outcome: 'in_progress'` to `'unknown'`)

2. **Phone Number Empty**: ✅ FIXED (we updated playbook to ask for phone)

3. **Webhook Parsing Errors**: 🔴 NOT FIXED
   - VAPI may be sending events we don't handle
   - Payload structure might not match our expectations
   - No authentication so we can't verify requests are from VAPI

---

## Comparison to Best Practices

### ✅ What We Do Right:
- Dynamic tenant detection
- Request ID tracking for distributed tracing
- Structured logging
- Base64 transcript encoding to avoid JSONB size limits

### ❌ What We Do Wrong:
- No webhook authentication (CRITICAL)
- Incorrect payload parsing structure
- Only handle 2 of 19 event types
- No timeout protection
- No webhook signature verification
- No idempotency for retries

---

## Recommended Architecture (VAPI Docs)

### Proper Webhook Flow:
```
VAPI → POST /api/vapi/webhook
       ↓
    1. Verify authentication (Bearer/HMAC/OAuth)
       ↓
    2. Parse { message: { type, call } } structure
       ↓
    3. Route by event type
       ↓
    4. Process async (queue/background job)
       ↓
    5. Return 200 OK immediately (< 7.5s)
       ↓
    6. Handle retries idempotently
```

### What We Actually Do:
```
VAPI → POST /api/vapi/webhook
       ↓
    ❌ No auth check
       ↓
    Parse event (with wrong structure)
       ↓
    If assistant-request or end-of-call-report → process
    Else → ignore
       ↓
    Sync database operations (slow)
       ↓
    Return 200 OK
```

---

## Next Steps

See `WEBHOOK_FIX_PLAN.md` for comprehensive remediation plan.
