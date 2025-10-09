import twilio from 'twilio'
import { createClient } from '@/lib/db'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export interface Booking {
  id: string
  confirmation: string
  name: string
  phone: string
  address: string
  service_type: string
  preferred_date: string
  preferred_time: string
  tenant_id: string
  email?: string
  notes?: string
}

export async function sendBookingConfirmation(booking: Booking) {
  const supabase = createClient()

  // Get tenant info
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, phone')
    .eq('id', booking.tenant_id)
    .single()

  const businessName = tenant?.name || 'AutoRev'
  const businessPhone = tenant?.phone || process.env.TWILIO_PHONE_NUMBER

  const message = `✅ Appointment Confirmed - ${businessName}

📅 ${formatDate(booking.preferred_date)}
🕐 ${booking.preferred_time}
🔧 ${booking.service_type}
📍 ${booking.address}

🔖 Confirmation: ${booking.confirmation}

Add to calendar:
${generateCalendarLink(booking)}

Need help? Call ${businessPhone}

Thank you!`

  try {
    const result = await twilioClient.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatPhoneNumber(booking.phone),
      body: message
    })

    console.log('✅ SMS confirmation sent:', {
      to: booking.phone,
      sid: result.sid,
      confirmation: booking.confirmation
    })

    return result
  } catch (error: any) {
    console.error('❌ Failed to send SMS:', error)
    throw error
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '')

  // Add +1 if not present (US/Canada)
  if (digits.length === 10) {
    return `+1${digits}`
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }

  return phone // Return as-is if already formatted or international
}

function generateCalendarLink(booking: Booking): string {
  // Parse the date and time
  const [year, month, day] = booking.preferred_date.split('-').map(Number)
  const [time, period] = booking.preferred_time.split(' ')
  let [hours, minutes] = time.split(':').map(Number)

  // Convert to 24-hour format
  if (period === 'PM' && hours !== 12) {
    hours += 12
  } else if (period === 'AM' && hours === 12) {
    hours = 0
  }

  const startDate = new Date(year, month - 1, day, hours, minutes || 0)
  const endDate = new Date(startDate.getTime() + 60 * 60000) // +1 hour

  const title = encodeURIComponent(`${booking.service_type} - ${booking.name}`)
  const details = encodeURIComponent(
    `Service: ${booking.service_type}\nAddress: ${booking.address}\nConfirmation: ${booking.confirmation}`
  )
  const location = encodeURIComponent(booking.address)

  const dates = `${formatGoogleDate(startDate)}/${formatGoogleDate(endDate)}`

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`
}

function formatGoogleDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}
