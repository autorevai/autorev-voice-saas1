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
  return call.raw_json?.customer?.name ||
         call.raw_json?.customer?.phone ||
         'Unknown'
}

function decodeTranscript(transcriptUrl: string | null): string {
  if (!transcriptUrl) return 'No transcript available'

  if (transcriptUrl.startsWith('data:')) {
    try {
      const base64Data = transcriptUrl.split(',')[1]
      return decodeURIComponent(base64Data || '')
    } catch {
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
  const customerPhone = call.raw_json?.customer?.phone || 'N/A'
  const summary = call.raw_json?.summary || 'No summary available'
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
            </div>
            <div className={`px-4 py-2 rounded-lg border-2 font-semibold ${getOutcomeColor(call.outcome)}`}>
              {call.outcome || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Phone className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="text-lg font-semibold text-gray-900">{customerPhone}</p>
              </div>
            </div>
          </div>

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
              <div className={`p-2 rounded-lg ${call.outcome === 'booked' ? 'bg-green-100' : 'bg-gray-100'}`}>
                {call.outcome === 'booked' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {call.outcome === 'booked' ? 'Booked' : 'Not Booked'}
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
