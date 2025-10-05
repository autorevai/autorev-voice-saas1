import { createClient } from '@/lib/db'

export default async function TestDashboard() {
  const db = await createClient()
  
  try {
    // Get demo tenant data
    const { data: tenant } = await db
      .from('tenants')
      .select('id, name, setup_completed')
      .eq('id', process.env.DEMO_TENANT_ID)
      .single()
    
    // Get assistants
    const { data: assistants } = await db
      .from('assistants')
      .select('*')
      .eq('tenant_id', process.env.DEMO_TENANT_ID)
    
    // Get calls today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()
    
    const { count: callsToday } = await db
      .from('calls')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', process.env.DEMO_TENANT_ID)
      .gte('started_at', todayISO)
    
    // Get bookings today
    const { count: bookingsToday } = await db
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', process.env.DEMO_TENANT_ID)
      .gte('created_at', todayISO)
    
    // Get recent calls
    const { data: recentCalls } = await db
      .from('calls')
      .select(`
        id, 
        vapi_call_id, 
        started_at, 
        ended_at, 
        duration_sec, 
        outcome, 
        transcript_url, 
        raw_json,
        bookings(name, phone)
      `)
      .eq('tenant_id', process.env.DEMO_TENANT_ID)
      .order('started_at', { ascending: false })
      .limit(10)
    
    const conversionRate = callsToday && callsToday > 0 ? (bookingsToday || 0) / callsToday * 100 : 0
    
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Dashboard (No Auth Required)</h1>
          
          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Calls Today</h3>
              <p className="text-3xl font-bold text-gray-900">{callsToday || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Bookings Today</h3>
              <p className="text-3xl font-bold text-gray-900">{bookingsToday || 0}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Conversion Rate</h3>
              <p className="text-3xl font-bold text-gray-900">{conversionRate.toFixed(1)}%</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-sm font-medium text-gray-500">Total Bookings</h3>
              <p className="text-3xl font-bold text-gray-900">{bookingsToday || 0}</p>
            </div>
          </div>
          
          {/* Tenant Info */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-4">Tenant Information</h2>
            <p><strong>Name:</strong> {tenant?.name || 'Not found'}</p>
            <p><strong>Setup Completed:</strong> {tenant?.setup_completed ? 'Yes' : 'No'}</p>
            <p><strong>Tenant ID:</strong> {process.env.DEMO_TENANT_ID}</p>
          </div>
          
          {/* Assistants */}
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h2 className="text-lg font-semibold mb-4">Assistants</h2>
            {assistants && assistants.length > 0 ? (
              <div className="space-y-4">
                {assistants.map((assistant: any) => (
                  <div key={assistant.id} className="border p-4 rounded">
                    <p><strong>Name:</strong> {assistant.name}</p>
                    <p><strong>VAPI Assistant ID:</strong> {assistant.vapi_assistant_id}</p>
                    <p><strong>Phone Number:</strong> {assistant.vapi_number_id || 'Not assigned'}</p>
                    <p><strong>Status:</strong> {assistant.status}</p>
                    <p><strong>Webhook URL:</strong> {assistant.webhook_url || 'Not set'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p>No assistants found</p>
            )}
          </div>
          
          {/* Recent Calls */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-4">Recent Calls</h2>
            {recentCalls && recentCalls.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Call ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Outcome</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentCalls.map((call: any) => (
                      <tr key={call.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {call.vapi_call_id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(call.started_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {call.duration_sec ? `${Math.floor(call.duration_sec / 60)}m ${call.duration_sec % 60}s` : 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            call.outcome === 'booked' ? 'bg-green-100 text-green-800' :
                            call.outcome === 'handoff' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {call.outcome}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {call.bookings?.[0]?.name || 'N/A'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>No calls found</p>
            )}
          </div>
        </div>
      </div>
    )
    
  } catch (error: any) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Test Dashboard Error</h1>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error.message}</p>
          </div>
        </div>
      </div>
    )
  }
}
