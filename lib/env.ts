export const ENV = {
  VAPI_API_KEY: process.env.VAPI_API_KEY!,
  WEBHOOK_SHARED_SECRET: process.env.WEBHOOK_SHARED_SECRET!,
  ELEVEN_VOICE_ID: process.env.ELEVEN_VOICE_ID!,
  MODEL_PROVIDER: (process.env.VAPI_MODEL_PROVIDER || 'openai') as 'openai'|'groq'|'anthropic',
  MODEL_NAME: process.env.VAPI_MODEL_NAME || 'gpt-4o-mini',
};

if (!ENV.VAPI_API_KEY) throw new Error('Missing VAPI_API_KEY');
if (!ENV.WEBHOOK_SHARED_SECRET) throw new Error('Missing WEBHOOK_SHARED_SECRET');
if (!ENV.ELEVEN_VOICE_ID) throw new Error('Missing ELEVEN_VOICE_ID');
