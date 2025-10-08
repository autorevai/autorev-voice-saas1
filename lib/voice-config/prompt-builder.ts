// lib/voice-config/prompt-builder.ts

import { VoiceConfig, STYLE_GUIDES } from './types'

interface Tenant {
  name: string
  industry?: string
  system_prompt?: string
}

export function buildSystemPrompt(tenant: Tenant, config: VoiceConfig): string {
  const styleGuide = STYLE_GUIDES[config.style]

  // Build greeting based on type
  let greeting: string
  if (config.greetingType === 'custom' && config.customGreeting) {
    greeting = config.customGreeting
  } else if (config.greetingType === 'emergency') {
    greeting = `Thank you for calling ${tenant.name}. If this is an emergency, please say 'emergency' now, otherwise I'm happy to help schedule your service.`
  } else {
    greeting = `Thank you for calling ${tenant.name}, how can I help you today?`
  }

  // Build transfer rules section
  const transferRules: string[] = []
  if (config.transferTriggers.onAngry) {
    transferRules.push('- If the customer seems frustrated, angry, or upset, empathize and offer to transfer them to a manager or have someone call them back.')
  }
  if (config.transferTriggers.onComplex) {
    transferRules.push('- For complex technical questions or specialized requests beyond basic scheduling, offer to have an expert call them back.')
  }
  if (config.transferTriggers.onRequest) {
    transferRules.push('- If customer explicitly asks to speak with a human or requests a transfer, accommodate immediately and politely.')
  }

  // Build business info section
  const businessInfo = config.keyInfo.length > 0
    ? config.keyInfo.map(info => `- ${info}`).join('\n')
    : 'Provide helpful general information about the business.'

  // Build services section
  const servicesInfo = config.services.length > 0
    ? config.services.map(s => {
        let line = `- ${s.name}`
        if (s.priceRange) line += ` (${s.priceRange})`
        return line
      }).join('\n')
    : 'Offer to book appointments for any requested services.'

  // Construct the full system prompt
  return `# AI Receptionist for ${tenant.name}

You are an AI receptionist for ${tenant.name}, a ${tenant.industry || 'service'} company.

## PERSONALITY AND COMMUNICATION STYLE

${styleGuide.description}

Example greeting style: ${styleGuide.example}

${config.allowInterruptions
  ? 'Allow customers to interrupt you naturally during the conversation. Listen actively for their input.'
  : 'Complete your thoughts before pausing to listen for the customer\'s response.'}

## OPENING GREETING

Start every call with exactly this greeting:
"${greeting}"

## BUSINESS INFORMATION

Key facts about ${tenant.name}:
${businessInfo}

## SERVICES OFFERED

${servicesInfo}

## CALL HANDLING RULES

${transferRules.length > 0 ? transferRules.join('\n') : '- Handle all inquiries professionally and attempt to schedule appointments when appropriate.'}

## PRIMARY OBJECTIVE

Your main goal is to:
1. Provide excellent customer service
2. Accurately collect customer information
3. Schedule appointments when appropriate
4. Transfer to humans when needed

${tenant.system_prompt ? `\n## ADDITIONAL INSTRUCTIONS\n\n${tenant.system_prompt}` : ''}

Remember: You represent ${tenant.name}. Be helpful, accurate, and professional at all times.`
}

// Helper to preview what a prompt will look like
export function previewPrompt(tenant: Tenant, config: VoiceConfig): {
  greeting: string
  style: string
  keyPoints: string[]
} {
  return {
    greeting: config.greetingType === 'custom' && config.customGreeting
      ? config.customGreeting
      : `Thank you for calling ${tenant.name}...`,
    style: STYLE_GUIDES[config.style].label,
    keyPoints: [
      `Voice: ${config.voice}`,
      `Style: ${config.style}`,
      `${config.keyInfo.length} key facts`,
      `${config.services.length} services`,
      `${Object.values(config.transferTriggers).filter(Boolean).length} transfer rules`
    ]
  }
}
