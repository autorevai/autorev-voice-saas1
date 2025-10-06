# VAPI Configuration Guide

## Step 1: Add Environment Variable to Vercel

The code is already deployed, but you need to ensure the `WEBHOOK_SHARED_SECRET` is in Vercel:

1. Go to: https://vercel.com/autorevai/autorev-voice-saas1/settings/environment-variables
2. Check if `WEBHOOK_SHARED_SECRET` exists
3. If not, add it:
   - **Key**: `WEBHOOK_SHARED_SECRET`
   - **Value**: `k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM` (from your .env.local)
   - **Environment**: Production, Preview, Development (all three)
4. Click "Save"
5. **Important**: Redeploy the app after adding the variable

---

## Step 2: Configure VAPI Assistant to Send Secret

You need to configure VAPI to send the secret in webhook requests.

### Option A: Via VAPI Dashboard (Recommended)

1. Go to: https://dashboard.vapi.ai
2. Navigate to **Credentials** section
3. Click "Create Credential"
4. Configure:
   - **Name**: `AutoRev Webhook Auth`
   - **Type**: `Bearer Token` or `API Key`
   - **Header Name**: `x-vapi-secret` (or `Authorization` if Bearer)
   - **Value**: `k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM`
5. Save the credential and note the `credentialId`

6. Go to your assistant: **Test 8 HVAC Receptionist**
7. Click **Advanced** → **Server URL**
8. Configure:
   - **URL**: `https://autorev-voice-saas1.vercel.app/api/vapi/webhook`
   - **Credential**: Select the credential you created above
9. Save

### Option B: Via VAPI API

```bash
# 1. Create credential
curl -X POST "https://api.vapi.ai/credential" \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "custom",
    "apiKey": "k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM"
  }'

# This will return: { "id": "<credential-id>", ... }

# 2. Update assistant with server URL and credential
curl -X PATCH "https://api.vapi.ai/assistant/9d1b9795-6a7b-49e7-8c68-ce45895338c3" \
  -H "Authorization: Bearer $VAPI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "serverUrl": "https://autorev-voice-saas1.vercel.app/api/vapi/webhook",
    "serverUrlSecret": "k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM"
  }'
```

---

## Step 3: Verify Configuration

### Test 1: Check Assistant Configuration

```bash
npx tsx scripts/verify-assistant-playbook.ts 9d1b9795-6a7b-49e7-8c68-ce45895338c3
```

Look for `serverUrl` in the output.

### Test 2: Make a Test Call

1. Call the assistant: `+17402403270`
2. Say something like: "My AC isn't working"
3. Provide your information when asked

### Test 3: Check Vercel Logs

Go to: https://vercel.com/autorevai/autorev-voice-saas1/logs

You should see:
- ✅ `📥 WEBHOOK RECEIVED: assistant-request`
- ✅ `🏢 TENANT DETECTED: 87e95cfd...`
- ✅ `✅ DB CALL CREATED`
- ✅ `📴 CALL ENDED`
- ✅ `✅ DB CALL UPDATED`

You should NOT see:
- ❌ `UNAUTHORIZED VAPI WEBHOOK`
- ❌ `INVALID WEBHOOK PAYLOAD`

---

## Step 4: Monitor First Call

After making a test call, check:

1. **Vercel Logs**: Should show clean webhook processing
2. **Supabase**: Check if call was created in `calls` table
3. **Database**: Run this query:

```sql
SELECT
  c.id,
  c.vapi_call_id,
  c.started_at,
  c.ended_at,
  c.duration_sec,
  c.outcome,
  length(c.transcript_url) as transcript_size,
  c.raw_json->>'summary' as summary
FROM calls c
ORDER BY c.created_at DESC
LIMIT 5;
```

---

## Troubleshooting

### If you see `UNAUTHORIZED VAPI WEBHOOK`:
- VAPI is not sending the secret
- Check VAPI dashboard → Assistant → Server URL → Credential is set
- Verify the credential has the correct secret value

### If you see `INVALID WEBHOOK PAYLOAD`:
- VAPI is sending unexpected payload structure
- Check Vercel logs for the full error message
- Open an issue on GitHub with the payload details

### If you see no webhooks at all:
- Check VAPI dashboard → Assistant → Server URL is set correctly
- Verify the URL: `https://autorev-voice-saas1.vercel.app/api/vapi/webhook`
- Test webhook endpoint manually:

```bash
curl -X POST "https://autorev-voice-saas1.vercel.app/api/vapi/webhook" \
  -H "x-vapi-secret: k1Vw_3sVdZr9qXnP4aH8Jf2Lr6Tt0BcM" \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "type": "status-update",
      "call": {
        "id": "test-call-123"
      }
    }
  }'
```

Expected response: `{"received":true,"requestId":"...","duration":...}`

---

## What Changed

### Before (Insecure):
- No authentication ❌
- Any payload structure accepted ❌
- No retry protection ❌
- Missing event handlers ❌

### After (Secure):
- Webhook authentication required ✅
- Strict payload validation ✅
- Idempotent retry handling ✅
- All critical events handled ✅

---

## Next Steps

1. Configure VAPI credential (Step 2 above)
2. Make a test call
3. Verify logs show clean processing
4. Report back any errors you see

Let me know when you've completed Step 2 and I'll help you test!
