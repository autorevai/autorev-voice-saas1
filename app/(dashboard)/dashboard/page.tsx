import { createClient } from '../../../lib/supabase/server'
import DashboardClient from './components/DashboardClient'
import PhoneNumberDisplay from './components/PhoneNumberDisplay'
import PhoneNumberCard from './components/PhoneNumberCard'

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
  bookings?: { name: string, phone: string }[] | null
}

interface Assistant {
  id: string
  vapi_assistant_id: string
  vapi_number_id: string | null
  name: string
  status: string
}

interface DashboardData {
  callsToday: number
  bookingsToday: number
  totalBookings: number
  conversionRate: number
  recentCalls: Call[]
  callsByDay: any[]
  conversionFunnel: any[]
  callsByHour: any[]
  callsTodayTrend: number
  bookingsTodayTrend: number
  conversionRateTrend: number
  totalBookingsTrend: number
  assistant: Assistant | null
  lastCallTime?: string
  // Setup status
  setupCompleted: boolean
}

async function getDashboardData(): Promise<DashboardData> {
  const db = await createClient()
  
  try {
    // Get the authenticated user's tenant
    const { data: { user }, error: authError } = await db.auth.getUser()
    
    if (authError) {
      console.error('Auth error:', authError)
      throw new Error('Authentication failed')
    }
    
    if (!user) {
      throw new Error('User not authenticated')
    }
    
    // Get user's tenant from users table
    const { data: userRecord, error: userError } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('User record error:', userError)
      throw new Error('User not found in database')
    }
    
    if (!userRecord?.tenant_id) {
      throw new Error('User has no tenant - please complete onboarding')
    }
    
    const tenantId = userRecord.tenant_id

    // Get tenant setup status
    const { data: tenant, error: tenantError } = await db
      .from('tenants')
      .select('setup_completed')
      .eq('id', tenantId)
      .single()
    
    if (tenantError) {
      console.error('Error fetching tenant:', tenantError)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get assistant info (may not exist if setup not completed)
    // Handle multiple assistants - get the most recent one
    const { data: assistants, error: assistantError } = await db
      .from('assistants')
      .select('*, vapi_number_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (assistantError) {
      console.error('Error fetching assistant:', assistantError)
    }

    // Use the most recently created assistant
    const assistant = assistants && assistants.length > 0 ? assistants[0] : null

    // Log if there are multiple assistants (this shouldn't happen normally)
    if (assistants && assistants.length > 1) {
      console.warn('⚠️  Multiple active assistants found for tenant:', {
        tenantId,
        count: assistants.length,
        assistants: assistants.map(a => ({ id: a.id, name: a.name, created_at: a.created_at }))
      })
    }

    // Get calls today
    const { count: callsToday } = await db
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('started_at', todayISO)

    // Get bookings today
    const { count: bookingsToday } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayISO)

    // Get total bookings
    const { count: totalBookings } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)

    // Calculate conversion rate
    const conversionRate = callsToday && callsToday > 0 
      ? Math.round(((bookingsToday || 0) / callsToday * 100) * 10) / 10
      : 0

    // Get recent calls with customer data
    const { data: recentCalls } = await db
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
      .limit(20)

    // Get calls by day for the last 7 days
    const { data: callsByDay } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('started_at', { ascending: true })

    // Get conversion funnel data
    const { data: conversionFunnel } = await db
      .from('calls')
      .select('outcome')
      .eq('tenant_id', tenantId)

    // Get calls by hour
    const { data: callsByHour } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .gte('started_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())

    // Get last call for last call time
    const { data: lastCall } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Process calls by day data
    const callsByDayMap = new Map()
    callsByDay?.forEach((call: any) => {
      const date = new Date(call.started_at).toISOString().split('T')[0]
      callsByDayMap.set(date, (callsByDayMap.get(date) || 0) + 1)
    })

    // Process conversion funnel data
    const funnelData = {
      total: conversionFunnel?.length || 0,
      booked: conversionFunnel?.filter((call: any) => call.outcome === 'booked').length || 0,
      handoff: conversionFunnel?.filter((call: any) => call.outcome === 'handoff').length || 0,
      unknown: conversionFunnel?.filter((call: any) => call.outcome === 'unknown').length || 0
    }

    // Process calls by hour data
    const callsByHourMap = new Map()
    callsByHour?.forEach((call: any) => {
      const hour = new Date(call.started_at).getHours()
      callsByHourMap.set(hour, (callsByHourMap.get(hour) || 0) + 1)
    })

    // Calculate trends (simplified for now)
    const callsTodayTrend = 0 // Simplified for now
    const bookingsTodayTrend = 0 // Simplified for now
    const conversionRateTrend = 0 // Simplified for now
    const totalBookingsTrend = 0 // Simplified for now

    return {
      callsToday: callsToday || 0,
      bookingsToday: bookingsToday || 0,
      totalBookings: totalBookings || 0,
      conversionRate,
      recentCalls: recentCalls || [],
      callsByDay: callsByDay || [],
      conversionFunnel: conversionFunnel || [],
      callsByHour: callsByHour || [],
      callsTodayTrend,
      bookingsTodayTrend,
      conversionRateTrend,
      totalBookingsTrend,
      assistant: assistant as Assistant,
      lastCallTime: lastCall?.started_at,
      setupCompleted: tenant?.setup_completed || false
    }
  } catch (error: any) {
    console.error('Dashboard data fetch error:', error)
    throw new Error(`Failed to fetch dashboard data: ${error.message}`)
  }
}

export default async function DashboardPage() {
  let data: DashboardData

  try {
    data = await getDashboardData()
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error loading dashboard data. Please check your configuration.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        
        {/* Voice AI Status Card */}
        {data.assistant && data.assistant.vapi_number_id && data.assistant.vapi_assistant_id ? (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Status Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-blue-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Voice AI Active</h2>
                      <p className="text-white/90 text-sm">Your receptionist is taking calls</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-white/90 text-sm font-medium">Live</span>
                  </div>
                </div>
              </div>

              {/* Phone Number Section */}
              <div className="px-6 py-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Customer Phone Number</h3>
                    <p className="text-3xl font-bold text-gray-900 font-mono mt-1">{data.assistant.vapi_number_id}</p>
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => data.assistant?.vapi_number_id && navigator.clipboard.writeText(data.assistant.vapi_number_id)}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy
                    </button>
                    <a
                      href={`tel:${data.assistant?.vapi_number_id || ''}`}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      Test Call
                    </a>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{data.callsToday}</div>
                    <div className="text-sm text-gray-500">Calls Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{data.bookingsToday}</div>
                    <div className="text-sm text-gray-500">Bookings Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{data.conversionRate}%</div>
                    <div className="text-sm text-gray-500">Conversion Rate</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !data.setupCompleted ? (
          <div className="mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Configure Your Voice AI</h3>
                    <p className="text-gray-600">Set up your AI receptionist to start taking calls</p>
                  </div>
                </div>
                <a 
                  href="/setup"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Setup Voice AI
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Configuration Error</h3>
                  <p className="text-red-700">Your setup is marked as completed but no assistant was found. Please contact support or retry setup.</p>
                </div>
              </div>
              <div className="mt-4">
                <a 
                  href="/setup"
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors inline-flex items-center"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry Setup
                </a>
              </div>
            </div>
          </div>
        )}

        <DashboardClient initialData={data} />
      </div>
    </div>
  )
}