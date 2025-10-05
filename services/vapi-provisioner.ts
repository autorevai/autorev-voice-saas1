import { VapiClient } from '@vapi-ai/server-sdk';
import { PLAYBOOK_TEMPLATES } from '@/lib/playbooks';
import type { ProvisioningConfig, ProvisioningResult } from '@/lib/types/provisioning';

const vapi = new VapiClient({ token: process.env.VAPI_API_KEY! });

export async function provisionVapiAssistant(
  config: ProvisioningConfig
): Promise<ProvisioningResult> {
  try {
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
    
    // 3. Create VAPI Assistant (simplified for now)
    const assistant = await vapi.assistants.create({
      name: `${config.businessName} Receptionist`,
      model: {
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }]
      },
      voice: {
        provider: '11labs',
        model: 'eleven_turbo_v2_5',
        voiceId: process.env.ELEVEN_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
        stability: 0.55,
        similarityBoost: 0.78,
        speed: 1.0
      },
      transcriber: {
        provider: 'deepgram',
        model: 'nova-2',
        language: 'en',
        smartFormat: true
      }
    });

    // 4. Purchase Phone Number
    const phoneNumber = await vapi.phoneNumbers.create({
      provider: 'vapi',
      assistantId: assistant.id
    });

    return {
      success: true,
      assistantId: assistant.id,
      phoneNumber: phoneNumber.number
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
