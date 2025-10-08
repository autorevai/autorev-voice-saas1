// lib/voice-config/types.ts

export type VoiceId = 'rachel' | 'james' | 'emma' | 'david'
export type StyleType = 'professional' | 'friendly' | 'efficient'
export type GreetingType = 'default' | 'emergency' | 'custom'

export interface VoiceConfig {
  // Voice settings
  voice: VoiceId
  style: StyleType
  allowInterruptions: boolean

  // Greeting configuration
  greetingType: GreetingType
  customGreeting?: string

  // Call handling rules
  transferTriggers: {
    onAngry: boolean
    onComplex: boolean
    onRequest: boolean
  }

  // Business information (manually entered for now)
  keyInfo: string[]  // ["Licensed & insured", "24/7 emergency service"]
  services: Array<{
    name: string
    priceRange?: string
    description?: string
  }>
}

// ElevenLabs Voice IDs mapping
export const VOICE_IDS: Record<VoiceId, string> = {
  rachel: '21m00Tcm4TlvDq8ikWAM',   // Professional, clear female (DEFAULT)
  james: 'onwK4e9ZLuTAKqWW03F9',    // Confident professional male
  emma: 'XrExE9yKIg1WjnnlVkGX',     // Energetic, friendly female
  david: 'nPczCjzI2devNBz1zQrb'     // Calm, reassuring male
} as const

// Voice descriptions for UI
export const VOICE_DESCRIPTIONS: Record<VoiceId, string> = {
  rachel: 'Professional and clear - perfect for business (default)',
  james: 'Confident and authoritative - great for trades',
  emma: 'Friendly and energetic - ideal for hospitality',
  david: 'Calm and reassuring - excellent for healthcare'
}

// Style descriptions
export const STYLE_GUIDES = {
  professional: {
    label: 'Professional',
    description: 'Formal, courteous language with complete sentences',
    example: '"Thank you for calling. How may I assist you today?"'
  },
  friendly: {
    label: 'Friendly',
    description: 'Warm, conversational tone with personal touches',
    example: '"Hey there! Thanks for calling. What can I help you with?"'
  },
  efficient: {
    label: 'Efficient',
    description: 'Direct and focused, gets to the point quickly',
    example: '"Hi, how can I help? Need to book a service?"'
  }
} as const

// Default config for new tenants
export const DEFAULT_VOICE_CONFIG: VoiceConfig = {
  voice: 'rachel',
  style: 'friendly',
  allowInterruptions: true,
  greetingType: 'default',
  customGreeting: undefined,
  transferTriggers: {
    onAngry: true,
    onComplex: true,
    onRequest: true
  },
  keyInfo: [],
  services: []
}

// Publish result type
export interface PublishResult {
  success: boolean
  error?: string
  duration?: number
  changes?: {
    voiceChanged: boolean
    promptChanged: boolean
  }
}
