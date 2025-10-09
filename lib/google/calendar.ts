import { google } from 'googleapis'
import { getOAuth2Client } from './auth'
import { createClient } from '@/lib/db'

export interface CalendarEvent {
  customer_name: string
  service: string
  start_time: Date
  duration_minutes: number
  customer_phone: string
  customer_email?: string
  notes?: string
}

export interface TimeSlot {
  start: Date
  end: Date
  available: boolean
}

// ⭐️ NEW: Get available time slots for a specific date
export async function getAvailableSlots(
  tenantId: string,
  date: Date,
  serviceDurationMinutes: number = 60
): Promise<string[]> {
  const supabase = createClient()

  // Get tenant's Google tokens
  const { data: tenant } = await supabase
    .from('tenants')
    .select('google_access_token, google_refresh_token, google_calendar_id, calendar_timezone')
    .eq('id', tenantId)
    .single()

  if (!tenant?.google_access_token) {
    throw new Error('No Google Calendar connected')
  }

  try {
    const auth = getOAuth2Client(
      tenant.google_access_token,
      tenant.google_refresh_token
    )

    const calendar = google.calendar({ version: 'v3', auth })

    // Set business hours (8 AM - 5 PM)
    const startOfDay = new Date(date)
    startOfDay.setHours(8, 0, 0, 0)

    const endOfDay = new Date(date)
    endOfDay.setHours(17, 0, 0, 0)

    // Fetch all events for the day
    const response = await calendar.events.list({
      calendarId: tenant.google_calendar_id || 'primary',
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    })

    const events = response.data.items || []

    // Generate all possible time slots (every 30 minutes)
    const allSlots: TimeSlot[] = []
    let currentTime = new Date(startOfDay)

    while (currentTime < endOfDay) {
      const slotEnd = new Date(currentTime.getTime() + serviceDurationMinutes * 60000)

      // Check if this slot conflicts with any existing event
      const hasConflict = events.some(event => {
        const eventStart = new Date(event.start?.dateTime || event.start?.date || '')
        const eventEnd = new Date(event.end?.dateTime || event.end?.date || '')

        // Check for overlap
        return (
          (currentTime >= eventStart && currentTime < eventEnd) ||
          (slotEnd > eventStart && slotEnd <= eventEnd) ||
          (currentTime <= eventStart && slotEnd >= eventEnd)
        )
      })

      allSlots.push({
        start: new Date(currentTime),
        end: slotEnd,
        available: !hasConflict
      })

      // Move to next 30-minute slot
      currentTime = new Date(currentTime.getTime() + 30 * 60000)
    }

    // Return only available slots as formatted strings
    return allSlots
      .filter(slot => slot.available)
      .map(slot => {
        const hours = slot.start.getHours()
        const minutes = slot.start.getMinutes()
        const ampm = hours >= 12 ? 'PM' : 'AM'
        const displayHours = hours % 12 || 12
        const displayMinutes = minutes.toString().padStart(2, '0')
        return `${displayHours}:${displayMinutes} ${ampm}`
      })
  } catch (error: any) {
    console.error('Failed to fetch availability:', error)

    // Token refresh logic
    if (error.code === 401 && tenant.google_refresh_token) {
      await refreshGoogleToken(tenantId, tenant.google_refresh_token)
      return getAvailableSlots(tenantId, date, serviceDurationMinutes)
    }

    throw error
  }
}

// ⭐️ NEW: Check if a specific time slot is available
export async function checkSlotAvailable(
  tenantId: string,
  requestedTime: Date,
  durationMinutes: number = 60
): Promise<boolean> {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('google_access_token, google_refresh_token, google_calendar_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.google_access_token) {
    console.log('No Google Calendar connected - allowing booking')
    return true // Allow booking if no calendar connected
  }

  try {
    const auth = getOAuth2Client(
      tenant.google_access_token,
      tenant.google_refresh_token
    )

    const calendar = google.calendar({ version: 'v3', auth })

    const requestedEnd = new Date(requestedTime.getTime() + durationMinutes * 60000)

    // Check for conflicts in this time range
    const response = await calendar.events.list({
      calendarId: tenant.google_calendar_id || 'primary',
      timeMin: requestedTime.toISOString(),
      timeMax: requestedEnd.toISOString(),
      singleEvents: true,
    })

    // If any events exist in this time range, slot is unavailable
    return (response.data.items || []).length === 0
  } catch (error) {
    console.error('Failed to check slot availability:', error)
    return true // Allow booking on error
  }
}

// EXISTING: Create calendar event
export async function createCalendarEvent(
  tenantId: string,
  event: CalendarEvent
) {
  const supabase = createClient()

  // Get tenant's Google tokens
  const { data: tenant, error } = await supabase
    .from('tenants')
    .select('google_access_token, google_refresh_token, google_calendar_id, calendar_timezone')
    .eq('id', tenantId)
    .single()

  if (error || !tenant?.google_access_token) {
    console.log('No Google Calendar connected for tenant:', tenantId)
    return null
  }

  try {
    const auth = getOAuth2Client(
      tenant.google_access_token,
      tenant.google_refresh_token
    )

    const calendar = google.calendar({ version: 'v3', auth })

    // Calculate end time
    const endTime = new Date(event.start_time)
    endTime.setMinutes(endTime.getMinutes() + event.duration_minutes)

    // Create event
    const response = await calendar.events.insert({
      calendarId: tenant.google_calendar_id || 'primary',
      requestBody: {
        summary: `${event.service} - ${event.customer_name}`,
        description: `
Customer: ${event.customer_name}
Phone: ${event.customer_phone}
${event.customer_email ? `Email: ${event.customer_email}` : ''}
${event.notes ? `\nNotes: ${event.notes}` : ''}
        `.trim(),
        start: {
          dateTime: event.start_time.toISOString(),
          timeZone: tenant.calendar_timezone || 'America/New_York',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: tenant.calendar_timezone || 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 60 },
            { method: 'email', minutes: 24 * 60 },
          ],
        },
      },
    })

    return response.data
  } catch (error: any) {
    console.error('Calendar event creation failed:', error)

    // If token expired, try to refresh
    if (error.code === 401 && tenant.google_refresh_token) {
      await refreshGoogleToken(tenantId, tenant.google_refresh_token)
      return createCalendarEvent(tenantId, event)
    }

    throw error
  }
}

// EXISTING: Delete calendar event
export async function deleteCalendarEvent(
  tenantId: string,
  eventId: string
) {
  const supabase = createClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('google_access_token, google_refresh_token, google_calendar_id')
    .eq('id', tenantId)
    .single()

  if (!tenant?.google_access_token) return

  try {
    const auth = getOAuth2Client(
      tenant.google_access_token,
      tenant.google_refresh_token
    )

    const calendar = google.calendar({ version: 'v3', auth })

    await calendar.events.delete({
      calendarId: tenant.google_calendar_id || 'primary',
      eventId,
    })

    console.log('✅ Calendar event deleted:', eventId)
  } catch (error) {
    console.error('Calendar event deletion failed:', error)
  }
}

// Helper: Refresh expired Google tokens
async function refreshGoogleToken(tenantId: string, refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )

  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()

  const supabase = createClient()
  await supabase
    .from('tenants')
    .update({
      google_access_token: credentials.access_token,
      google_token_expires_at: credentials.expiry_date
        ? new Date(credentials.expiry_date)
        : null,
    })
    .eq('id', tenantId)

  console.log('✅ Google token refreshed for tenant:', tenantId)
}
