// services/vapi.ts
import { VapiClient } from '@vapi-ai/server-sdk';

const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! });
const PUBLIC_APP_URL = process.env.PUBLIC_APP_URL!;
if (!PUBLIC_APP_URL) throw new Error('Set PUBLIC_APP_URL in Vercel env (e.g., https://yourapp.vercel.app)');

export type TenantInput = {
  id: string;
  businessName: string;
  market: 'hvac' | 'plumbing' | 'electrical';
  voiceId?: string;                     // optional override
  modelProvider?: 'openai'|'groq'|'anthropic';
  modelName?: string;                   // e.g., gpt-4o-mini
};

export async function provisionAssistantForTenant(tenant: TenantInput) {
  const provider = tenant.modelProvider || (process.env.VAPI_MODEL_PROVIDER as any) || 'openai';
  const model    = tenant.modelName     || process.env.VAPI_MODEL_NAME || 'gpt-4o-mini';
  const voiceId  = tenant.voiceId       || process.env.ELEVEN_VOICE_ID || undefined;
  const toolsUrl = `${PUBLIC_APP_URL}/api/tools`;

  const SYSTEM_PROMPT = buildPrompt(tenant.businessName, tenant.market);

  const assistant = await (vapi as any).assistants.upsert({
    name: `${tenant.businessName} Receptionist`,
    model: {
      provider,
      model,
      temperature: 0.7,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }],
    },
    voice: {
      provider: '11labs',
      model: 'eleven_turbo_v2_5',
      ...(voiceId ? { voiceId } : {}),
      autoMode: true,
      stability: 0.55,
      similarityBoost: 0.78,
      speed: 1.0,
      punctuationBoundaries: ['.', '?', '!'],
      inputMinCharacters: 24,
    },
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
      numerals: true,
    },
    tools: [
      {
        type: 'function',
        name: 'create_booking',
        description: 'Create a job (or queue entry) for this customer.',
        strict: true,
        async: false, // IMPORTANT: wait for result, then speak
        parameters: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            phone: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zip: { type: 'string' },
            summary: { type: 'string' },
            equipment: { type: 'string' },
            window: { type: 'string' },
          },
        },
        server: {
          url: toolsUrl,
          headers: {
            'Content-Type': 'application/json',
            'x-tool-name': 'create_booking',
            'x-shared-secret': `Bearer ${process.env.WEBHOOK_SHARED_SECRET}`,
          },
          timeoutSeconds: 20,
        },
      },
    ],
  });

  const number = await (vapi as any).phoneNumbers.create({
    provider: 'vapi',   // Free Telephony
   smsEnabled: true,
    assistantId: assistant.id,
  });

  return { assistantId: assistant.id, phoneNumber: number.number };
}

function buildPrompt(businessName: string, market: string) {
  return `You are "${businessName} Concierge," a fast, friendly scheduler for ${market}.

=== CONSTRAINTS & TONE ===
• Friendly, efficient, never salesy. One question at a time (12–18 words).
• Stop talking when the caller starts; continue from what they said.

=== NUMBER & RANGE READING ===
• Never speak dashes; say "to". Example: "8 to 11", "$89 to $129".

=== BOOKING FLOW (ASK ONLY WHAT'S MISSING) ===
1) Full name
2) Mobile
3) Address parts: street+unit → city → state → ZIP
4) Issue (brief), equipment (central AC|heat pump|mini-split), access notes (optional)
5) Preferred time window (offer earliest standard; emergencies get earliest emergency window)

Call create_booking as soon as you have name, mobile, full address, and a window.

=== TOOL RESULT HANDLING (STRICT) ===
• If tool result includes say: speak it verbatim immediately.
• If end_conversation=true: stop after speaking.
• Treat success=true | ok=true | status in ["booked","saved","sent"] as success.
• If success but no say: If window present, say "You're all set. We'll see you {window}." then stop.

=== GUARDRAILS ===
• No medical/fire advice. On tool error: apologize once, retry once, then offer human follow-up.
`;
}
