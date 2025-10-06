# Webhook Fix Plan

## Priority Levels
- 🔥 **P0 (CRITICAL)**: Security/data corruption - fix immediately
- 🚨 **P1 (HIGH)**: Breaking functionality - fix soon
- ⚠️ **P2 (MEDIUM)**: Degraded experience - fix when convenient
- 📝 **P3 (LOW)**: Nice-to-have improvements

---

## Phase 1: Critical Security & Correctness (P0/P1)

### 🔥 P0-1: Add Webhook Authentication
**Files**: `app/api/vapi/webhook/route.ts`

**Implementation**:
```typescript
function verifyVapiWebhook(req: NextRequest): boolean {
  // Option 1: Shared Secret (simplest, what we use for tools)
  const secret = req.headers.get('x-vapi-secret') ||
                 req.headers.get('authorization')?.replace('Bearer ', '');
  const expected = process.env.VAPI_WEBHOOK_SECRET;

  if (!expected) {
    console.warn('⚠️ VAPI_WEBHOOK_SECRET not set - webhook authentication disabled!');
    return true; // Allow in dev, but warn
  }

  return secret === expected;
}

export async function POST(req: NextRequest) {
  // Add as first check
  if (!verifyVapiWebhook(req)) {
    console.error('❌ UNAUTHORIZED VAPI WEBHOOK');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of handler
}
```

**Environment Variable Needed**:
```bash
VAPI_WEBHOOK_SECRET=your-secret-here
```

**VAPI Configuration** (in dashboard):
- Go to assistant settings → Advanced → Server URL
- Add credential with secret matching `VAPI_WEBHOOK_SECRET`

---

### 🚨 P1-1: Fix Webhook Payload Parsing
**Files**: `app/api/vapi/webhook/route.ts`

**Current (Wrong)**:
```typescript
const event = JSON.parse(rawBody);
const message = event?.message || event;  // ← Bad fallback
const messageType = message?.type || event?.type;
```

**Correct**:
```typescript
const payload = JSON.parse(rawBody);

// VAPI always sends: { message: { type, call, ... } }
if (!payload.message || !payload.message.type) {
  log.error('Invalid VAPI webhook payload structure', { payload });
  return NextResponse.json({
    error: 'Invalid payload - expected { message: { type, call } }'
  }, { status: 400 });
}

const message = payload.message;
const messageType = message.type;
const call = message.call || {};
```

---

### 🚨 P1-2: Handle All Critical Event Types
**Files**: `app/api/vapi/webhook/route.ts`

**Add Handlers For**:
1. `status-update` - Track call status changes
2. `tool-calls` - Confirm tool execution (already handled in /api/tools)
3. `hang` - Call hung up before end-of-call-report
4. `conversation-update` - Real-time transcript updates (optional but useful)

**Implementation**:
```typescript
switch (messageType) {
  case 'assistant-request':
    return handleAssistantRequest(message, call, tenantId, log);

  case 'end-of-call-report':
    return handleEndOfCall(message, call, tenantId, log);

  case 'status-update':
    return handleStatusUpdate(message, call, tenantId, log);

  case 'hang':
    return handleHangup(message, call, tenantId, log);

  case 'tool-calls':
    // Tool calls are handled by /api/tools endpoint
    log.info('Tool call event - handled by tools API', { callId: call.id });
    return NextResponse.json({ received: true });

  case 'conversation-update':
  case 'transcript':
  case 'speech-update':
    // Optional: log for debugging but don't process
    log.debug('Informational event received', { type: messageType });
    return NextResponse.json({ received: true });

  default:
    log.warn('Unknown webhook event type', { type: messageType });
    return NextResponse.json({
      received: true,
      warning: `Unknown event type: ${messageType}`
    });
}
```

---

### 🚨 P1-3: Add Idempotency for Retries
**Files**: `app/api/vapi/webhook/route.ts`

**Problem**: VAPI retries failed webhooks. Without idempotency, we create duplicate records.

**Solution**:
```typescript
async function handleEndOfCall(message, call, tenantId, log) {
  const callId = call.id;

  // Check if already processed
  const { data: existing } = await supabase
    .from('calls')
    .select('id, ended_at')
    .eq('vapi_call_id', callId)
    .single();

  if (existing?.ended_at) {
    log.info('Call already processed (retry detected)', { callId });
    return NextResponse.json({
      received: true,
      status: 'already_processed'
    });
  }

  // If record exists without ended_at, UPDATE it
  if (existing) {
    const { error } = await supabase
      .from('calls')
      .update({
        ended_at: callData.endedAt,
        duration_sec: callData.duration,
        transcript_url: transcriptUrl,
        outcome: 'completed',
        raw_json: rawJson
      })
      .eq('vapi_call_id', callId);

    // ... handle error
  } else {
    // Create new record
    // ... existing insert logic
  }
}
```

---

## Phase 2: Robustness & Performance (P2)

### ⚠️ P2-1: Add Timeout Protection
**Implementation**: Use Promise.race with timeout

```typescript
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string
): Promise<T> {
  const timeout = new Promise<T>((_, reject) =>
    setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
  );

  return Promise.race([promise, timeout]);
}

// Usage
const tenantId = await withTimeout(
  detectTenant(phoneNumber, assistantId, log),
  5000, // 5 second timeout
  'Tenant detection'
);
```

---

### ⚠️ P2-2: Improve Error Responses
**Current**: Return 200 OK even on errors (VAPI will retry forever)

**Better**:
- 200: Successfully processed
- 400: Bad request (VAPI won't retry)
- 401: Unauthorized (VAPI won't retry)
- 500: Server error (VAPI will retry)

```typescript
if (!tenantId) {
  log.error('Tenant not found', { assistantId, phoneNumber });
  // Return 400 - this is a configuration error, don't retry
  return NextResponse.json({
    error: 'Tenant not found - check assistant configuration',
    requestId
  }, { status: 400 });
}
```

---

### ⚠️ P2-3: Add Webhook Event Logging Table
**Migration**: `supabase/migrations/YYYYMMDD_webhook_events.sql`

```sql
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id VARCHAR(50) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  call_id VARCHAR(255),
  tenant_id UUID REFERENCES tenants(id),
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_webhook_events_call_id ON webhook_events(call_id);
CREATE INDEX idx_webhook_events_type ON webhook_events(event_type);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at);
```

**Purpose**: Debug webhook issues, audit trail, replay failed events

---

## Phase 3: Monitoring & Observability (P3)

### 📝 P3-1: Add Structured Metrics
```typescript
// Track webhook processing metrics
const metrics = {
  event_type: messageType,
  processing_time_ms: Date.now() - startTime,
  tenant_found: !!tenantId,
  call_created: !!callCreated,
  error: !!error
};

log.info('Webhook processed', metrics);
```

---

### 📝 P3-2: Add Webhook Test Endpoint
**File**: `app/api/vapi/webhook/test/route.ts`

```typescript
export async function POST(req: NextRequest) {
  // Simulate VAPI webhook events for testing
  const { eventType } = await req.json();

  const testPayloads = {
    'assistant-request': { /* ... */ },
    'end-of-call-report': { /* ... */ },
    // etc
  };

  // Send to webhook handler
  // Return results
}
```

---

## Implementation Order

### Week 1 (Critical Fixes)
1. ✅ Add webhook authentication (P0-1) - **30 min**
2. ✅ Fix payload parsing (P1-1) - **20 min**
3. ✅ Add idempotency (P1-3) - **45 min**
4. ✅ Test with real call - **15 min**

### Week 2 (Robustness)
5. ✅ Handle all event types (P1-2) - **1 hour**
6. ✅ Add timeout protection (P2-1) - **30 min**
7. ✅ Improve error responses (P2-2) - **20 min**

### Week 3 (Monitoring)
8. ✅ Add webhook events table (P2-3) - **45 min**
9. ✅ Add structured metrics (P3-1) - **20 min**
10. ✅ Create test endpoint (P3-2) - **30 min**

**Total Time**: ~5 hours over 3 weeks

---

## Quick Win: Fix Right Now (30 minutes)

If you want to fix the most critical issues immediately:

1. Add `VAPI_WEBHOOK_SECRET` to `.env.local` and Vercel
2. Add authentication check at top of webhook POST handler
3. Fix payload parsing to expect `{ message: { type, call } }`
4. Configure VAPI dashboard to send secret in webhook requests

These 4 changes will fix:
- ✅ Security vulnerability
- ✅ Most parsing errors
- ✅ Ability to verify webhooks are from VAPI

---

## Testing Plan

After each phase:

1. **Manual Test**: Make test call, check logs
2. **Verify Database**: Check call record created correctly
3. **Check Vercel Logs**: Ensure no errors
4. **Test Error Cases**:
   - Wrong secret → 401
   - Invalid payload → 400
   - Missing tenant → 400
   - Duplicate event → already_processed

---

## Rollback Plan

If changes cause issues:

1. Git revert to previous commit
2. Redeploy via Vercel
3. VAPI will continue sending webhooks (they queue)
4. Fix issue and redeploy

---

## Success Metrics

After implementing:

- ✅ Zero unauthorized webhook access
- ✅ Zero "invalid payload" errors in logs
- ✅ Zero duplicate call records
- ✅ All call events properly logged
- ✅ < 1 second webhook processing time
- ✅ Clean, readable Vercel logs with emoji titles

---

## Questions Before Starting?

1. Do you want to implement all phases or just Phase 1 (critical fixes)?
2. Should I start with authentication first or payload parsing?
3. Do you want me to create a backup branch before making changes?
