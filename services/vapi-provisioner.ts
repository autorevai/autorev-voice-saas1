import { config } from 'dotenv';
import { VapiClient } from '@vapi-ai/server-sdk';
import { PLAYBOOK_TEMPLATES } from '@/lib/playbooks';
import type { ProvisioningConfig, ProvisioningResult } from '@/lib/types/provisioning';

// Load environment variables
config({ path: '.env.local' });

// Validate required env vars (only at runtime, not build time)
function validateEnvVars() {
  if (process.env.NODE_ENV === 'production') {
    const REQUIRED_ENV = ['VAPI_API_KEY', 'NEXT_PUBLIC_APP_URL', 'WEBHOOK_SHARED_SECRET'];
    for (const key of REQUIRED_ENV) {
      if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
      }
    }
  }
}

const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! });

export async function provisionVapiAssistant(
  config: ProvisioningConfig
): Promise<ProvisioningResult> {
  try {
    // Validate environment variables at runtime
    validateEnvVars();
    
    // Check if we have VAPI API key
    if (!process.env.VAPI_API_KEY) {
      return {
        success: false,
        error: 'VAPI_API_KEY not configured'
      };
    }

    // 1. Get playbook template
    const playbook = PLAYBOOK_TEMPLATES[config.profile.industry];
    
    if (!playbook) {
      return {
        success: false,
        error: `No playbook found for industry: ${config.profile.industry}`
      };
    }
    
    // 2. Build system prompt (inject business name, hours, area)
    const systemPrompt = buildSystemPrompt(playbook.systemPrompt, config);
    
    // 3. Create VAPI Assistant
    // Truncate business name to fit VAPI's 40-character limit
    const truncatedBusinessName = config.businessName.length > 25 
      ? config.businessName.substring(0, 25) 
      : config.businessName
    const assistantName = `${truncatedBusinessName} Receptionist`
    
    const assistant = await vapi.assistants.create({
      name: assistantName,
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 150,
        messages: [{ role: 'system', content: systemPrompt }]
      },
      voice: {
        provider: '11labs',
        model: 'eleven_turbo_v2_5',
        voiceId: process.env.ELEVEN_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
        stability: 0.5,
        similarityBoost: 0.75,
        speed: 1.0
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
        smartFormat: true
      },
      firstMessage: `Hi, thanks for calling ${config.businessName}. What can I help you with today?`
    });

    // 4. Add tools to assistant using PATCH request
    const toolIds = [
      '6ec7dfc4-c44a-4b13-b1cc-409d192c6355', // create_booking
      '1017d954-0a78-4099-abd9-d85ea9551aca', // quote_estimate
      '0dcefa2c-3c13-473b-a306-f5cf1c3ef093', // handoff_sms
      'a203126f-3187-4c91-96a4-c448f72cdfa6'  // update_crm_note
    ];

    // Update assistant with tools
    await vapi.assistants.update(assistant.id, {
      model: {
        provider: 'openai',
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 150,
        messages: [{ role: 'system', content: systemPrompt }],
        toolIds: toolIds
      },
      voice: {
        provider: '11labs',
        model: 'eleven_turbo_v2_5',
        voiceId: process.env.ELEVEN_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
        stability: 0.5,
        similarityBoost: 0.75,
        speed: 1.0
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
        smartFormat: true
      },
      firstMessage: `Hi, thanks for calling ${config.businessName}. What can I help you with today?`
    });

            // 5. Try to Purchase Phone Number (may fail due to rate limits)
            let phoneNumber = null;
            let phoneProvisioningFailed = false;
            
            try {
              // Create systematic naming convention: [TenantSlug]-[Industry]-[Date]
              const tenantSlug = config.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
              const industry = config.profile.industry;
              const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
              const phoneName = `${tenantSlug}-${industry}-${dateStr}`;
              
              // Ensure phone name is within 40 character limit
              const finalPhoneName = phoneName.length > 40 ? phoneName.substring(0, 40) : phoneName;
              
              const phone = await vapi.phoneNumbers.create({
                provider: 'vapi',
                assistantId: assistant.id,
                name: finalPhoneName,
                numberDesiredAreaCode: '740',
                // CRITICAL: Set server for call lifecycle webhooks (HTTPS required)
                server: {
                  url: `https://${process.env.NEXT_PUBLIC_APP_URL || 'autorev-voice-saas1-7p9utuwbb-chris-diyannis-projects.vercel.app'}/api/vapi/webhook`
                },
                fallbackDestination: {
                  type: 'number',
                  number: config.profile.businessHours?.emergencyPhone?.startsWith('+1') 
                    ? config.profile.businessHours.emergencyPhone 
                    : `+1${config.profile.businessHours?.emergencyPhone || '8445551234'}`
                }
              });
              phoneNumber = phone.number;
              console.log('✅ Phone provisioned successfully:', phoneNumber);
              console.log('📞 Phone name:', finalPhoneName);
            } catch (phoneError: any) {
              console.warn('⚠️  Phone provisioning failed:', phoneError.message);
              phoneProvisioningFailed = true;
              // Continue without phone - not critical for assistant functionality
            }

            return {
              success: true,
              assistantId: assistant.id,
              phoneNumber: phoneNumber,
              phoneProvisioningFailed: phoneProvisioningFailed,
              message: phoneNumber 
                ? 'Assistant created successfully!' 
                : 'Assistant created, but phone provisioning failed. You can add a phone number manually in VAPI dashboard.'
            };

  } catch (error: any) {
    console.error('VAPI provisioning error:', error);
    return {
      success: false,
      error: error.message || 'Failed to provision VAPI assistant'
    };
  }
}

function buildSystemPrompt(template: string, config: ProvisioningConfig): string {
  // Replace placeholders in template
  return template
    .replace(/\[Business Name\]/g, config.businessName)
    .replace(/\[service area\]/g, config.profile.serviceArea.join(', '))
    .replace(/\[business hours\]/g, config.profile.businessHours.weekdays);
}
