import { createClient } from '../../../../../lib/supabase/server'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Phone, Clock, CheckCircle, XCircle, User, MapPin, Calendar } from 'lucide-react'

interface Call {
  id: string
  vapi_call_id: string
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  outcome: string | null
  transcript_url: string | null
  raw_json: any
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_city: string | null
  customer_state: string | null
  customer_zip: string | null
}

interface ToolResult {
  id: string
  tool_name: string
  request_json: any
  response_json: any
  success: boolean
  created_at: string
}

interface Booking {
  id: string
  name: string
  phone: string
  email: string | null
  address: string
  city: string | null
  state: string | null
  zip: string | null
  confirmation: string
  window_text: string
  start_ts: string
  summary: string | null
}

interface CallDetails {
  call: Call
  toolResults: ToolResult[]
  booking: Booking | null
}

async function getCallDetails(callId: string): Promise<CallDetails | null> {
  const db = await createClient()

  try {
    // Get authenticated user's tenant
    const { data: { user }, error: authError } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Get user's tenant from users table
    const { data: userRecord, error: userError } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !userRecord?.tenant_id) {
      throw new Error('User tenant not found')
    }

    const tenantId = userRecord.tenant_id

    // Get call details
    const { data: call, error: callError } = await db
      .from('calls')
      .select('*')
      .eq('id', callId)
      .eq('tenant_id', tenantId)
      .single()

    if (callError || !call) {
      return null
    }

    // Get tool results for this call
    const { data: toolResults } = await db
      .from('tool_results')
      .select('*')
      .eq('call_id', callId)
      .order('created_at', { ascending: true })

    // Get booking if exists
    const { data: booking } = await db
      .from('bookings')
      .select('*')
      .eq('call_id', callId)
      .single()

    return {
      call,
      toolResults: toolResults || [],
      booking: booking || null
    }
  } catch (error) {
    console.error('Call details fetch error:', error)
    return null
  }
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getOutcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'booked': return 'text-green-700 bg-green-50 border-green-200'
    case 'handoff': return 'text-purple-700 bg-purple-50 border-purple-200'
    case 'failed': return 'text-red-700 bg-red-50 border-red-200'
    case 'abandoned': return 'text-yellow-700 bg-yellow-50 border-yellow-200'
    case 'no_answer': return 'text-gray-700 bg-gray-50 border-gray-200'
    case 'busy': return 'text-orange-700 bg-orange-50 border-orange-200'
    default: return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

function getCustomerName(call: Call): string {
  return call.customer_name ||
         call.raw_json?.customer?.name ||
         call.customer_phone ||
         call.raw_json?.customer?.phone ||
         'Unknown'
}

function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'N/A'

  // Remove any non-digit characters
  const digits = phone.replace(/\D/g, '')

  // Handle US phone numbers (10 or 11 digits)
  if (digits.length === 11 && digits.startsWith('1')) {
    // Remove leading 1
    const usNumber = digits.substring(1)
    return `${usNumber.substring(0, 3)}-${usNumber.substring(3, 6)}-${usNumber.substring(6)}`
  } else if (digits.length === 10) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`
  }

  // Return original if not standard format
  return phone
}

function formatAddress(call: Call): string | null {
  if (!call.customer_address) return null

  const parts = [call.customer_address]
  if (call.customer_city && call.customer_state) {
    parts.push(`${call.customer_city}, ${call.customer_state} ${call.customer_zip || ''}`.trim())
  } else if (call.customer_city) {
    parts.push(call.customer_city)
  }

  return parts.join(', ')
}

function parseFullName(name: string | null): { firstName: string; lastName: string } {
  if (!name) return { firstName: '', lastName: '' }

  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' }
  }

  const firstName = parts[0]
  const lastName = parts.slice(1).join(' ')
  return { firstName, lastName }
}

function decodeTranscript(transcriptUrl: string | null): string {
  if (!transcriptUrl) return 'No transcript available'

  if (transcriptUrl.startsWith('data:')) {
    try {
      const base64Data = transcriptUrl.split(',')[1]
      if (!base64Data) return 'No transcript data'

      // Decode base64 to text
      const decodedText = Buffer.from(base64Data, 'base64').toString('utf-8')
      return decodedText
    } catch (error) {
      console.error('Error decoding transcript:', error)
      return 'Error decoding transcript'
    }
  }

  return transcriptUrl
}

export default async function CallDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const callDetails = await getCallDetails(id)

  if (!callDetails) {
    notFound()
  }

  const { call, toolResults, booking } = callDetails
  const customerName = getCustomerName(call)
  const { firstName, lastName } = parseFullName(call.customer_name)
  const customerPhone = formatPhoneNumber(call.customer_phone || call.raw_json?.customer?.phone)
  const callerPhone = formatPhoneNumber(call.raw_json?.customer?.phone) // The actual number they called from
  const customerAddress = formatAddress(call)
  const summary = call.raw_json?.summary || 'No summary available'
  const serviceType = booking?.summary || call.raw_json?.service_type || 'Not specified'
  const transcript = decodeTranscript(call.transcript_url)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium mb-3 inline-block"
          >
            ← Back to Dashboard
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{customerName}</h1>
              <p className="text-sm text-gray-500 mt-1">{formatDateTime(call.started_at)}</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">
                Call ID: {call.vapi_call_id}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 font-semibold ${getOutcomeColor(booking ? 'booked' : call.outcome)}`}>
              {booking ? 'Booked' : (call.outcome || 'Unknown')}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-base font-semibold text-gray-900">{customerPhone}</p>
              </div>
            </div>
          </div>

          {customerAddress && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="text-sm font-semibold text-gray-900">{customerAddress}</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="text-lg font-semibold text-gray-900">{formatDuration(call.duration_sec)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${booking ? 'bg-green-100' : 'bg-gray-100'}`}>
                {booking ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {booking ? 'Booked' : 'Not Booked'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Details (if exists) */}
        {booking && (
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-sm border-2 border-blue-200 p-6 mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <h2 className="text-xl font-bold text-gray-900">Booking Confirmed</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Confirmation Code</p>
                    <p className="text-lg font-bold text-blue-600">{booking.confirmation}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Customer</p>
                    <p className="text-base font-semibold text-gray-900">{booking.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Contact</p>
                    <p className="text-base text-gray-900">{booking.phone}</p>
                    {booking.email && <p className="text-sm text-gray-600">{booking.email}</p>}
                  </div>
                </div>
              </div>
              <div>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Appointment Time</p>
                    <p className="text-base font-semibold text-gray-900">{booking.window_text}</p>
                    <p className="text-sm text-gray-600">{formatDateTime(booking.start_ts)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Service Address</p>
                    <p className="text-base text-gray-900">{booking.address}</p>
                    {booking.city && booking.state && (
                      <p className="text-sm text-gray-600">{booking.city}, {booking.state} {booking.zip}</p>
                    )}
                  </div>
                  {booking.summary && (
                    <div>
                      <p className="text-sm text-gray-600">Service Type</p>
                      <p className="text-base text-gray-900">{booking.summary}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CRM Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Customer Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Name */}
            {firstName && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">First Name</p>
                <p className="text-base text-gray-900">{firstName}</p>
              </div>
            )}
            {lastName && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Last Name</p>
                <p className="text-base text-gray-900">{lastName}</p>
              </div>
            )}

            {/* Contact */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Phone Number</p>
              <p className="text-base text-gray-900">{customerPhone}</p>
              {callerPhone !== customerPhone && (
                <p className="text-xs text-gray-500 mt-1">Called from: {callerPhone}</p>
              )}
            </div>

            {/* Service Request */}
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Service Type</p>
              <p className="text-base text-gray-900">{serviceType}</p>
            </div>

            {/* Address fields */}
            {call.customer_address && (
              <>
                <div className="md:col-span-2 lg:col-span-3">
                  <p className="text-sm font-medium text-gray-500 mb-1">Street Address</p>
                  <p className="text-base text-gray-900">{call.customer_address}</p>
                </div>
                {call.customer_city && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">City</p>
                    <p className="text-base text-gray-900">{call.customer_city}</p>
                  </div>
                )}
                {call.customer_state && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">State</p>
                    <p className="text-base text-gray-900">{call.customer_state}</p>
                  </div>
                )}
                {call.customer_zip && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 mb-1">ZIP Code</p>
                    <p className="text-base text-gray-900">{call.customer_zip}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Call Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Call Summary</h2>
            <p className="text-gray-700 leading-relaxed">{summary}</p>
          </div>

          {/* AI Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">AI Actions ({toolResults.length})</h2>
            {toolResults.length === 0 ? (
              <p className="text-gray-500 text-sm">No AI actions taken during this call</p>
            ) : (
              <div className="space-y-3">
                {toolResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-gray-900 capitalize">
                        {result.tool_name.replace(/_/g, ' ')}
                      </span>
                      {result.success ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    {result.response_json?.say && (
                      <p className="text-sm text-gray-600 italic">"{result.response_json.say}"</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Transcript */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Full Transcript</h2>
          <div className="bg-gray-50 rounded-lg p-6 max-h-96 overflow-y-auto">
            <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
              {transcript}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
