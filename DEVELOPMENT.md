# Development Guide

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or pnpm
- Supabase account
- VAPI account

### Environment Setup

1. Copy `.env.local.backup` to `.env.local` if needed:
```bash
cp .env.local.backup .env.local
```

2. Verify all required environment variables are set:
```bash
node scripts/check-env.js
```

Required variables:
- `WEBHOOK_SHARED_SECRET` - Shared secret for webhook authentication
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `DEMO_TENANT_ID` - Demo tenant UUID
- `VAPI_API_KEY` - VAPI API key
- `ELEVEN_VOICE_ID` - ElevenLabs voice ID

### Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

## 🧪 Testing

### Test Scripts

We provide several test scripts to validate the system:

#### 1. Test Webhook Endpoint
```bash
npx tsx scripts/test-webhook.ts
```

Tests:
- Assistant request webhooks
- End-of-call report webhooks
- Status update webhooks
- Tool call webhooks

#### 2. Test Tools API
```bash
npx tsx scripts/test-tools-api.ts
```

Tests:
- `create_booking` - Valid and invalid data
- `quote_estimate` - Different service types
- `handoff_sms` - Customer handoff
- `update_crm_note` - CRM notes

#### 3. Seed Test Data
```bash
npx tsx scripts/seed-test-data.ts
```

Seeds the database with:
- 3 test calls
- 3 test bookings
- 3 test tool results

### Manual Testing

#### Test Webhook Locally
```bash
curl -X POST http://localhost:3000/api/vapi/webhook \
  -H "Content-Type: application/json" \
  -H "x-shared-secret: YOUR_SECRET" \
  -d '{
    "message": {
      "type": "assistant-request",
      "call": {
        "id": "test_call_123",
        "startedAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
      }
    }
  }'
```

#### Test Tools API Locally
```bash
curl -X POST http://localhost:3000/api/tools \
  -H "Content-Type: application/json" \
  -H "x-shared-secret: YOUR_SECRET" \
  -H "x-tool-name: create_booking" \
  -d '{
    "name": "John Doe",
    "phone": "+14155551234",
    "address": "123 Main St",
    "city": "San Francisco",
    "state": "CA",
    "zip": "94102",
    "service_type": "HVAC Maintenance"
  }'
```

## 📐 Architecture

### API Routes

#### `/api/vapi/webhook`
Handles all VAPI webhook events:
- `assistant-request` - Creates new call record
- `end-of-call-report` - Updates call with end data
- `status-update` - Logs call status changes
- `tool-calls` - Logs tool invocations

**Request ID Tracing**: All webhook calls are traced with a unique `requestId` for debugging.

#### `/api/tools`
Handles VAPI tool invocations:
- `create_booking` - Creates booking with validation
- `quote_estimate` - Provides price estimates
- `handoff_sms` - Logs handoff requests
- `update_crm_note` - Logs CRM notes

**Input Validation**: All booking data is validated and sanitized before DB insertion.

#### `/api/voice/inbound`
Twilio voice webhook that routes calls to VAPI via media streams.

### Core Libraries

#### `lib/validation.ts`
Input validation utilities:
- `validatePhone()` - Phone number validation
- `validateEmail()` - Email validation
- `validateAddress()` - Address validation
- `validateBookingData()` - Composite validation

#### `lib/request-id.ts`
Request ID generation and logging:
- `generateRequestId()` - Generates unique request IDs
- `getOrCreateRequestId()` - Extracts or creates request ID
- `createLogger()` - Creates logger with request ID

#### `lib/db.ts`
Supabase client with comprehensive logging.

#### `lib/playbooks.ts`
Industry-specific playbooks (HVAC, plumbing, electrical, dental, legal, medical).

## 🔍 Debugging

### View Logs

**Local Development:**
```bash
npm run dev
```
Logs appear in terminal with format:
```
[2025-10-05T20:00:00.000Z] [COMPONENT_LEVEL] [req_abc123] Message { data }
```

**Production (Vercel):**
```bash
vercel logs
```

Filter by component:
```bash
vercel logs | grep "VAPI_WEBHOOK"
vercel logs | grep "TOOLS_API"
vercel logs | grep "ERROR"
```

### Request ID Tracing

Every API request gets a unique `requestId` that appears in:
- Logs
- Response JSON
- Database records (future enhancement)

Use this to trace a request across multiple services:
```bash
vercel logs | grep "req_abc123"
```

### Common Issues

#### Issue: `ELEVEN_VOICE_ID` not set
**Solution**: Add to `.env.local`:
```
ELEVEN_VOICE_ID=21m00tcm4tlvdq8ikwam
```

#### Issue: TypeScript errors
**Solution**: Run type check:
```bash
npx tsc --noEmit
```

#### Issue: Database connection fails
**Solution**: Verify Supabase environment variables:
```bash
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### Issue: Webhook authentication fails
**Solution**: Ensure VAPI is configured with same `WEBHOOK_SHARED_SECRET`.

## 📊 Database Schema

### Core Tables

**tenants** - Multi-tenant organizations
**users** - User accounts
**user_tenants** - User-tenant relationships with roles
**assistants** - VAPI assistant configurations
**calls** - Call records
**tool_results** - Tool invocation logs
**bookings** - Service appointments

### Key Relationships
- `calls.tenant_id` → `tenants.id`
- `calls.assistant_id` → `assistants.id`
- `bookings.tenant_id` → `tenants.id`
- `bookings.call_id` → `calls.id`
- `tool_results.call_id` → `calls.id`

## 🚢 Deployment

### Vercel Deployment

```bash
vercel --prod
```

### Environment Variables

All production environment variables must be set in Vercel dashboard:
- Settings → Environment Variables
- Add each variable from `.env.local`

### Post-Deployment Verification

1. Check deployment logs:
```bash
vercel logs --follow
```

2. Test webhook endpoint:
```bash
curl https://your-app.vercel.app/api/health
```

3. Test VAPI integration:
- Make a test call to your VAPI number
- Check Vercel logs for webhook activity

## 📝 Code Style

- Use TypeScript strict mode
- Prefer `const` over `let`
- Use descriptive variable names
- Add JSDoc comments for public functions
- Keep functions under 50 lines
- Extract complex logic into helper functions

## 🤝 Contributing

1. Create feature branch
2. Make changes with tests
3. Run linter: `npm run lint` (if configured)
4. Test locally
5. Create pull request

## 📚 Additional Resources

- [VAPI Documentation](https://docs.vapi.ai)
- [Supabase Documentation](https://supabase.com/docs)
- [Next.js 15 Documentation](https://nextjs.org/docs)
- [Twilio Media Streams](https://www.twilio.com/docs/voice/media-streams)
