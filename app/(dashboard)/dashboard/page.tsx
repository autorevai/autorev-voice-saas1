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
    const { data: assistant, error: assistantError } = await db
      .from('assistants')
      .select('*, vapi_number_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .maybeSingle() // Use maybeSingle() instead of single() to handle no results
    
    if (assistantError) {
      console.error('Error fetching assistant:', assistantError)
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

    // Get recent calls with customer names from bookings
    const { data: recentCalls } = await db
      .from('calls')
      .select(`
        id, 
        vapi_call_id,
        started_at,
        ended_at,
        duration_sec,
        outcome,
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
        
        {/* Setup Success Banner */}
        {data.assistant && data.assistant.vapi_number_id && (
          <PhoneNumberCard phoneNumber={data.assistant.vapi_number_id} />
        )}

        {/* Setup Banner - Show when setup is not completed */}
        {!data.setupCompleted ? (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-800 mb-2">
                    Complete Your Setup
                  </h3>
                  <p className="text-blue-700 mb-4">
                    Configure your AI voice receptionist to start taking calls.
                  </p>
                </div>
                <div>
                  <a 
                    href="/setup"
                    className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition-colors inline-block"
                  >
                    Configure Voice Agent
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : data.assistant && data.assistant.vapi_number_id && data.assistant.vapi_assistant_id ? (
          // Success Display - Show when setup IS completed
          <PhoneNumberDisplay 
            phoneNumber={data.assistant.vapi_number_id}
            assistantId={data.assistant.vapi_assistant_id}
          />
        ) : (
          // Fallback - No assistant found
          <div className="mb-8">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Setup Error
              </h3>
              <p className="text-red-700 mb-4">
                Your setup is marked as completed but no assistant was found. Please contact support.
              </p>
              <a 
                href="/setup"
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors inline-block"
              >
                Retry Setup
              </a>
            </div>
          </div>
        )}

        <DashboardClient initialData={data} />
      </div>
    </div>
  )
}