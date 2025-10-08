// lib/twilio/client.ts
import twilio from 'twilio'

function getTwilioClient() {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    throw new Error('TWILIO_ACCOUNT_SID is not set in environment variables')
  }

  if (!process.env.TWILIO_AUTH_TOKEN) {
    throw new Error('TWILIO_AUTH_TOKEN is not set in environment variables')
  }

  if (!process.env.TWILIO_PHONE_NUMBER) {
    throw new Error('TWILIO_PHONE_NUMBER is not set in environment variables')
  }

  return twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  )
}

// Lazy initialization
let _client: ReturnType<typeof twilio> | null = null

export const twilioClient = {
  get messages() {
    if (!_client) {
      _client = getTwilioClient()
    }
    return _client.messages
  }
}

export const TWILIO_CONFIG = {
  get phoneNumber() {
    return process.env.TWILIO_PHONE_NUMBER!
  },
  get accountSid() {
    return process.env.TWILIO_ACCOUNT_SID!
  },
} as const

// Helper to format phone numbers
export function formatPhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '')

  // Add +1 if US number without country code
  if (cleaned.length === 10) {
    return `+1${cleaned}`
  }

  // Add + if missing
  if (!phone.startsWith('+')) {
    return `+${cleaned}`
  }

  return phone
}

// Validate phone number
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  // US/Canada: 10 digits, International: 10-15 digits
  return cleaned.length >= 10 && cleaned.length <= 15
}
