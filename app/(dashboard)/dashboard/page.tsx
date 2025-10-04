import { createClient } from '../../../lib/db'
import DashboardClient from './components/DashboardClient'
import VapiStatusCard from '../components/VapiStatusCard'
import VapiSuccessMessage from '../components/VapiSuccessMessage'

interface Call {
  id: string
  vapi_call_id: string
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  outcome: string | null
  bookings?: {
    name: string
    phone: string
  }[] | null
}

interface Assistant {
  id: string
  vapi_assistant_id: string
  vapi_number_id: string
  name: string
  status: string
  settings_json: any
}

interface DashboardData {
  callsToday: number
  bookingsToday: number
  totalBookings: number
  conversionRate: number
  recentCalls: Call[]
  // Chart data
  callsByDay: { date: string; calls: number }[]
  conversionFunnel: { name: string; value: number; percentage: number }[]
  callsByHour: { hour: string; calls: number }[]
  // Trend data
  callsTodayTrend: number
  bookingsTodayTrend: number
  conversionRateTrend: number
  totalBookingsTrend: number
  // VAPI data
  assistant?: Assistant
  lastCallTime?: string
}

async function getDashboardData(): Promise<DashboardData> {
  const db = createClient()
  const tenantId = process.env.DEMO_TENANT_ID
  
  if (!tenantId) {
    throw new Error('DEMO_TENANT_ID not configured')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayISO = today.toISOString()

  try {
    // Get assistant info
    const { data: assistant } = await db
      .from('assistants')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('status', 'active')
      .single()

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
        bookings!left(name, phone)
      `)
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(20)

    // Get last call time
    const { data: lastCall } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    const conversionRate = callsToday && callsToday > 0 
      ? Math.round((bookingsToday || 0) / callsToday * 100) 
      : 0

    // Get calls by day for last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    sevenDaysAgo.setHours(0, 0, 0, 0)

    const { data: callsByDayData } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .gte('started_at', sevenDaysAgo.toISOString())
      .order('started_at', { ascending: true })

    // Process calls by day
    const callsByDayMap = new Map<string, number>()
    const today = new Date()
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      callsByDayMap.set(dateStr, 0)
    }

    callsByDayData?.forEach(call => {
      const dateStr = call.started_at.split('T')[0]
      if (callsByDayMap.has(dateStr)) {
        callsByDayMap.set(dateStr, (callsByDayMap.get(dateStr) || 0) + 1)
      }
    })

    const callsByDay = Array.from(callsByDayMap.entries()).map(([date, calls]) => ({
      date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      calls
    }))

    // Get conversion funnel data
    const { data: allCalls } = await db
      .from('calls')
      .select('outcome')
      .eq('tenant_id', tenantId)

    const totalCalls = allCalls?.length || 0
    const bookedCalls = allCalls?.filter(call => call.outcome === 'booked').length || 0
    const handoffCalls = allCalls?.filter(call => call.outcome === 'handoff').length || 0
    const unknownCalls = allCalls?.filter(call => call.outcome === 'unknown' || !call.outcome).length || 0

    const conversionFunnel = [
      { name: 'Total Calls', value: totalCalls, percentage: 100 },
      { name: 'Booked', value: bookedCalls, percentage: totalCalls > 0 ? Math.round((bookedCalls / totalCalls) * 100) : 0 },
      { name: 'Handoff', value: handoffCalls, percentage: totalCalls > 0 ? Math.round((handoffCalls / totalCalls) * 100) : 0 },
      { name: 'Unknown', value: unknownCalls, percentage: totalCalls > 0 ? Math.round((unknownCalls / totalCalls) * 100) : 0 }
    ]

    // Get calls by hour for today
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const { data: callsByHourData } = await db
      .from('calls')
      .select('started_at')
      .eq('tenant_id', tenantId)
      .gte('started_at', todayStart.toISOString())
      .lte('started_at', todayEnd.toISOString())

    // Process calls by hour
    const callsByHourMap = new Map<string, number>()
    callsByHourData?.forEach(call => {
      const hour = new Date(call.started_at).getHours()
      const hourStr = hour === 0 ? '12am' : hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`
      callsByHourMap.set(hourStr, (callsByHourMap.get(hourStr) || 0) + 1)
    })

    const callsByHour = Array.from(callsByHourMap.entries())
      .map(([hour, calls]) => ({ hour, calls }))
      .sort((a, b) => {
        const aHour = a.hour.includes('am') ? parseInt(a.hour) : parseInt(a.hour) + 12
        const bHour = b.hour.includes('am') ? parseInt(b.hour) : parseInt(b.hour) + 12
        return aHour - bHour
      })

    // Calculate trends (simplified - comparing with yesterday)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    yesterday.setHours(0, 0, 0, 0)
    const yesterdayEnd = new Date(yesterday)
    yesterdayEnd.setHours(23, 59, 59, 999)

    const { count: callsYesterday } = await db
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('started_at', yesterday.toISOString())
      .lte('started_at', yesterdayEnd.toISOString())

    const { count: bookingsYesterday } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .gte('created_at', yesterday.toISOString())
      .lte('created_at', yesterdayEnd.toISOString())

    const callsTodayTrend = callsYesterday && callsYesterday > 0 
      ? Math.round(((callsToday || 0) - callsYesterday) / callsYesterday * 100)
      : 0

    const bookingsTodayTrend = bookingsYesterday && bookingsYesterday > 0
      ? Math.round(((bookingsToday || 0) - bookingsYesterday) / bookingsYesterday * 100)
      : 0

    const conversionRateTrend = 0 // Simplified for now
    const totalBookingsTrend = 0 // Simplified for now

    return {
      callsToday: callsToday || 0,
      bookingsToday: bookingsToday || 0,
      totalBookings: totalBookings || 0,
      conversionRate,
      recentCalls: recentCalls || [],
      callsByDay,
      conversionFunnel,
      callsByHour,
      callsTodayTrend,
      bookingsTodayTrend,
      conversionRateTrend,
      totalBookingsTrend,
      assistant: assistant as Assistant,
      lastCallTime: lastCall?.started_at
    }
  } catch (error) {
    console.error('Dashboard data fetch error:', error)
    throw new Error('Failed to fetch dashboard data')
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
        
        {/* VAPI Status Section */}
        {data.assistant ? (
          <div className="mb-8">
            <VapiStatusCard
              phoneNumber={data.assistant.vapi_number_id}
              isActive={data.assistant.status === 'active'}
              callsToday={data.callsToday}
              lastCall={data.lastCallTime}
            />
          </div>
        ) : (
          <div className="mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                Complete Your Setup
              </h3>
              <p className="text-yellow-700 mb-4">
                Set up your AI voice agent to start taking calls automatically.
              </p>
              <button className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 transition-colors">
                Configure Voice Agent
              </button>
            </div>
          </div>
        )}

        <DashboardClient initialData={data} />
      </div>
    </div>
  )
}
