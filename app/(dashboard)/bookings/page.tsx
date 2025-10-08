import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Phone, MapPin, Clock, User } from 'lucide-react'

interface Booking {
  id: string
  name: string
  phone: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  service_type: string | null
  preferred_time: string | null
  created_at: string
  status: string
  call_id: string | null
}

async function getBookings(): Promise<Booking[]> {
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

    // Get all bookings for this tenant
    const { data: bookings, error } = await db
      .from('bookings')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching bookings:', error)
      return []
    }

    return bookings || []
  } catch (error) {
    console.error('Failed to fetch bookings:', error)
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

function getStatusBadge(status: string) {
  const variants: Record<string, { color: string; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Pending' },
    confirmed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Confirmed' },
    completed: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'Completed' },
    cancelled: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' },
  }

  const variant = variants[status] || variants.pending

  return (
    <Badge className={`${variant.color} border`}>
      {variant.label}
    </Badge>
  )
}

export default async function BookingsPage() {
  const bookings = await getBookings()

  // Group bookings by date
  const bookingsByDate = bookings.reduce((acc, booking) => {
    const date = new Date(booking.created_at).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
    if (!acc[date]) {
      acc[date] = []
    }
    acc[date].push(booking)
    return acc
  }, {} as Record<string, Booking[]>)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Bookings</h1>
          <p className="text-gray-600">Manage your appointment bookings</p>
        </div>

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Total Bookings
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-blue-600">
                {bookings.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-green-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                This Week
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-green-600">
                {bookings.filter(b => {
                  const bookingDate = new Date(b.created_at)
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return bookingDate >= weekAgo
                }).length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Confirmed
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-purple-600">
                {bookings.filter(b => b.status === 'confirmed').length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-amber-500">
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-semibold uppercase tracking-wider">
                Pending
              </CardDescription>
              <CardTitle className="text-3xl font-bold text-amber-600">
                {bookings.filter(b => b.status === 'pending').length}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Bookings List */}
        {bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No bookings yet</h3>
                <p className="text-gray-600">Bookings will appear here when customers schedule appointments</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(bookingsByDate).map(([date, dateBookings]) => (
              <div key={date}>
                <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  {date}
                </h2>
                <div className="space-y-3">
                  {dateBookings.map((booking) => (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center">
                                <User className="w-5 h-5 text-gray-400 mr-2" />
                                <h3 className="text-lg font-semibold text-gray-900">{booking.name}</h3>
                              </div>
                              {getStatusBadge(booking.status || 'pending')}
                            </div>

                            <div className="grid md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <div className="flex items-center text-sm text-gray-600">
                                  <Phone className="w-4 h-4 mr-2 text-gray-400" />
                                  <a href={`tel:${booking.phone}`} className="hover:text-blue-600 hover:underline">
                                    {formatPhoneNumber(booking.phone)}
                                  </a>
                                </div>

                                {booking.address && (
                                  <div className="flex items-start text-sm text-gray-600">
                                    <MapPin className="w-4 h-4 mr-2 text-gray-400 mt-0.5" />
                                    <span>
                                      {booking.address}
                                      {booking.city && `, ${booking.city}`}
                                      {booking.state && `, ${booking.state}`}
                                      {booking.zip && ` ${booking.zip}`}
                                    </span>
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                {booking.service_type && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <span className="font-medium mr-2">Service:</span>
                                    <span>{booking.service_type}</span>
                                  </div>
                                )}

                                {booking.preferred_time && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <Clock className="w-4 h-4 mr-2 text-gray-400" />
                                    <span>{booking.preferred_time}</span>
                                  </div>
                                )}

                                <div className="flex items-center text-xs text-gray-500">
                                  <span>Booked: {new Date(booking.created_at).toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="ml-4 flex flex-col gap-2">
                            <a
                              href={`tel:${booking.phone}`}
                              className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                            >
                              <Phone className="w-4 h-4 mr-1" />
                              Call
                            </a>
                            {booking.call_id && (
                              <a
                                href={`/dashboard/calls/${booking.call_id}`}
                                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                              >
                                View Call
                              </a>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
