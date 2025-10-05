# Environment Variables Setup Guide

## Current Issues Fixed:
1. ✅ **Consistent variable names**: All files now use `NEXT_PUBLIC_APP_URL`
2. ✅ **Proper fallbacks**: Local development uses `http://localhost:3001`
3. ✅ **Production ready**: Vercel will use the environment variables you set

## Required Environment Variables:

### For Local Development (.env.local):
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPI
VAPI_API_KEY=your_vapi_api_key
WEBHOOK_SHARED_SECRET=your_webhook_secret

# App URL - LOCAL DEVELOPMENT
NEXT_PUBLIC_APP_URL=http://localhost:3001

# Demo
DEMO_TENANT_ID=your_demo_tenant_id
ELEVEN_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### For Production (Vercel Environment Variables):
```bash
# Supabase (same as local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# VAPI (same as local)
VAPI_API_KEY=your_vapi_api_key
WEBHOOK_SHARED_SECRET=your_webhook_secret

# App URL - PRODUCTION
NEXT_PUBLIC_APP_URL=https://autorev-voice-saas1.vercel.app

# Demo (same as local)
DEMO_TENANT_ID=your_demo_tenant_id
ELEVEN_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

## What Was Fixed:

1. **`services/vapi-provisioner.ts`**: Now uses `http://localhost:3001` as fallback for local development
2. **`app/api/provision/route.ts`**: Already correctly uses `http://localhost:3001` as fallback
3. **`services/vapi.ts`**: Updated error message to clarify local vs production usage

## How It Works:

- **Local Development**: Uses `http://localhost:3001` (no HTTPS needed for local)
- **Production**: Uses `https://autorev-voice-saas1.vercel.app` (HTTPS required for VAPI webhooks)
- **Vercel**: Automatically uses the environment variables you set in Vercel dashboard

## Next Steps:

1. Create `.env.local` file with the local development values
2. Set the production environment variables in Vercel dashboard
3. Test locally with `npm run dev`
4. Deploy to production and test webhook functionality
