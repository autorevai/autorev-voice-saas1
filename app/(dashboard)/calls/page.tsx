import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Clock, User, MapPin, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Call {
  id: string
  vapi_call_id: string
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  outcome: string
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_city: string | null
  customer_state: string | null
  customer_zip: string | null
  bookings?: { name: string; phone: string }[] | null
  missed_call_rescues?: { sms_sent: boolean; outcome: string | null }[] | null
}

async function getCalls(): Promise<Call[]> {
  const db = await createClient()

  try {
    // Get the authenticated user's tenant
    const { data: { user }, error: authError } = await db.auth.getUser()

    if (authError || !user) {
      throw new Error('Authentication failed')
    }

    // Get user's tenant
    const { data: userRecord } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) {
      throw new Error('No tenant found')
    }

    const tenantId = userRecord.tenant_id

    // Get all calls for this tenant
    // Note: We're using a LEFT JOIN pattern for missed_call_rescues since it's optional
    const { data: calls, error } = await db
      .from('calls')
      .select(`
        id,
        vapi_call_id,
        started_at,
        ended_at,
        duration_sec,
        outcome,
        customer_name,
        customer_phone,
        customer_address,
        customer_city,
        customer_state,
        customer_zip,
        bookings(name, phone)
      `)
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching calls:', error)
      return []
    }

    if (!calls || calls.length === 0) {
      return []
    }

    // Fetch recovery attempts for these calls
    const callIds = calls.map(c => c.id)
    const { data: recoveries } = await db
      .from('missed_call_rescues')
      .select('original_call_id, sms_sent, outcome')
      .in('original_call_id', callIds)

    // Merge recovery data into calls
    const callsWithRecoveries = calls.map(call => ({
      ...call,
      missed_call_rescues: recoveries?.filter(r => r.original_call_id === call.id) || []
    }))

    return callsWithRecoveries
  } catch (error) {
    console.error('Failed to fetch calls:', error)
    return []
  }
}

function formatPhoneNumber(phone: string | null): string {
  if (!phone) return 'N/A'
  const digits = phone.replace(/\D/g, '')

  if (digits.length === 11 && digits.startsWith('1')) {
    const usNumber = digits.substring(1)
    return `${usNumber.substring(0, 3)}-${usNumber.substring(3, 6)}-${usNumber.substring(6)}`
  } else if (digits.length === 10) {
    return `${digits.substring(0, 3)}-${digits.substring(3, 6)}-${digits.substring(6)}`
  }

  return phone
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return 'N/A'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getOutcomeBadge(outcome: string) {
  const variants: Record<string, { color: string; label: string }> = {
    booked: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Booked' },
    handoff: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Handoff' },
    completed: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Completed' },
    voicemail: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Voicemail' },
    abandoned: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Abandoned' },
    failed: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Failed' },
    unknown: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Unknown' },
  }

  const variant = variants[outcome] || variants.unknown

  return (
    <Badge className={`${variant.color} border`}>
      {variant.label}
    </Badge>
  )
}

function getRecoveryBadge(call: Call) {
  const rescue = call.missed_call_rescues?.[0]

  if (!rescue) return null

  if (rescue.outcome === 'booked') {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 border text-xs">
        🎯 Rescued
      </Badge>
    )
  }

  if (rescue.sms_sent) {
    return (
      <Badge className="bg-blue-100 text-blue-800 border-blue-200 border text-xs">
        💬 SMS Sent
      </Badge>
    )
  }

  return null
}

export default async function CallsPage() {
  const calls = await getCalls()

  // Calculate stats
  const totalCalls = calls.length
  const bookedCalls = calls.filter(c => c.outcome === 'booked').length
  const totalDuration = calls.reduce((sum, call) => sum + (call.duration_sec || 0), 0)
  const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0
  const conversionRate = totalCalls > 0 ? Math.round((bookedCalls / totalCalls) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Call History</h1>
          <p className="text-gray-600">View and analyze all incoming calls</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Total Calls
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {totalCalls}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Booked
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {bookedCalls}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Conversion Rate
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                {conversionRate}%
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Avg Duration
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {formatDuration(avgDuration)}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Calls Table */}
        {calls.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Phone className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No calls yet</h3>
                <p className="text-gray-600">Calls will appear here when customers contact your AI receptionist</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Calls</CardTitle>
              <CardDescription>Last {calls.length} calls</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Date & Time</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Customer</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Phone</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Location</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Duration</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Outcome</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 text-sm">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {calls.map((call) => (
                      <tr key={call.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-2 text-gray-400" />
                            <div>
                              <div className="font-medium">
                                {new Date(call.started_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {new Date(call.started_at).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {call.customer_name ? (
                            <div className="flex items-center">
                              <User className="w-4 h-4 mr-2 text-gray-400" />
                              <span className="font-medium text-gray-900">{call.customer_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Unknown</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {call.customer_phone ? (
                            <a href={`tel:${call.customer_phone}`} className="hover:text-blue-600 hover:underline">
                              {formatPhoneNumber(call.customer_phone)}
                            </a>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {call.customer_city || call.customer_state ? (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1 text-gray-400" />
                              <span>
                                {call.customer_city}{call.customer_city && call.customer_state ? ', ' : ''}{call.customer_state}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                          {formatDuration(call.duration_sec)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <div className="flex flex-col space-y-1">
                            {getOutcomeBadge(call.outcome)}
                            {getRecoveryBadge(call)}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <Link
                            href={`/dashboard/calls/${call.id}`}
                            className="text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
