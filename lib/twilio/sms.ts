// lib/twilio/sms.ts
import { twilioClient, TWILIO_CONFIG, formatPhoneNumber, isValidPhoneNumber } from './client'
import { createClient } from '@/lib/supabase/server'

export interface SendSMSOptions {
  to: string
  message: string
  tenantId: string
  type?: 'general' | 'missed_call' | 'payment_link' | 'review_request' | 'booking_confirm'
  bookingId?: string
}

export interface SMSResult {
  success: boolean
  sid?: string
  error?: string
}

/**
 * Send SMS via Twilio and log to database
 */
export async function sendSMS(options: SendSMSOptions): Promise<SMSResult> {
  const { to, message, tenantId, type = 'general', bookingId } = options

  try {
    // Validate phone number
    if (!isValidPhoneNumber(to)) {
      return {
        success: false,
        error: `Invalid phone number: ${to}`
      }
    }

    const formattedTo = formatPhoneNumber(to)

    console.log(`📤 Sending SMS to ${formattedTo}`, {
      type,
      tenantId,
      messageLength: message.length
    })

    // Send via Twilio
    const twilioMessage = await twilioClient.messages.create({
      to: formattedTo,
      from: TWILIO_CONFIG.phoneNumber,
      body: message
    })

    console.log(`✅ SMS sent successfully. SID: ${twilioMessage.sid}`)

    // Log to database
    try {
      const supabase = await createClient()
      const { error: dbError } = await supabase
        .from('sms_log')
        .insert({
          tenant_id: tenantId,
          to_number: formattedTo,
          from_number: TWILIO_CONFIG.phoneNumber,
          message,
          type,
          status: 'sent',
          twilio_sid: twilioMessage.sid,
          booking_id: bookingId || null
        })

      if (dbError) {
        console.error('Failed to log SMS to database:', dbError)
        // Don't fail the SMS send if DB logging fails
      }
    } catch (dbErr) {
      console.error('Database logging error:', dbErr)
    }

    return {
      success: true,
      sid: twilioMessage.sid
    }

  } catch (error: any) {
    console.error('SMS send error:', error)

    // Try to log error to database
    try {
      const supabase = await createClient()
      await supabase
        .from('sms_log')
        .insert({
          tenant_id: tenantId,
          to_number: formatPhoneNumber(to),
          from_number: TWILIO_CONFIG.phoneNumber,
          message,
          type,
          status: 'failed',
          twilio_sid: null,
          booking_id: bookingId || null
        })
    } catch {
      // Ignore DB errors when SMS already failed
    }

    return {
      success: false,
      error: error?.message || 'Unknown error sending SMS'
    }
  }
}

/**
 * Send missed call rescue SMS
 */
export async function sendMissedCallSMS(
  customerPhone: string,
  tenantId: string,
  companyPhone: string,
  companyName: string
): Promise<SMSResult> {
  const message = `Hi! We just tried to reach you at ${companyName}. Please call us back at ${companyPhone} or we'll try again shortly. Thank you!`

  return sendSMS({
    to: customerPhone,
    message,
    tenantId,
    type: 'missed_call'
  })
}

/**
 * Send booking confirmation SMS
 */
export async function sendBookingConfirmationSMS(
  customerPhone: string,
  tenantId: string,
  bookingDetails: {
    companyName: string
    date: string
    time: string
    bookingId: string
  }
): Promise<SMSResult> {
  const { companyName, date, time, bookingId } = bookingDetails

  const message = `✅ Your appointment with ${companyName} is confirmed for ${date} at ${time}. We'll see you then!`

  return sendSMS({
    to: customerPhone,
    message,
    tenantId,
    type: 'booking_confirm',
    bookingId
  })
}

/**
 * Send payment link SMS
 */
export async function sendPaymentLinkSMS(
  customerPhone: string,
  tenantId: string,
  paymentLink: string,
  amount: number,
  bookingId: string
): Promise<SMSResult> {
  const amountFormatted = `$${(amount / 100).toFixed(2)}`

  const message = `To secure your appointment, please complete your ${amountFormatted} deposit: ${paymentLink}`

  return sendSMS({
    to: customerPhone,
    message,
    tenantId,
    type: 'payment_link',
    bookingId
  })
}

/**
 * Send review request SMS
 */
export async function sendReviewRequestSMS(
  customerPhone: string,
  customerName: string,
  tenantId: string,
  reviewUrl: string,
  companyName: string
): Promise<SMSResult> {
  const message = `Hi ${customerName}! How was your recent service with ${companyName}? We'd love your feedback: ${reviewUrl}`

  return sendSMS({
    to: customerPhone,
    message,
    tenantId,
    type: 'review_request'
  })
}
