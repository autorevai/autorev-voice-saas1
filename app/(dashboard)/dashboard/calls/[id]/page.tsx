import { createClient } from '../../../../../lib/db'
import Link from 'next/link'
import { notFound } from 'next/navigation'

interface Call {
  id: string
  vapi_call_id: string
  started_at: string
  ended_at: string | null
  duration_sec: number | null
  outcome: string | null
  cost_cents: number
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

interface CallDetails {
  call: Call
  toolResults: ToolResult[]
}

async function getCallDetails(callId: string): Promise<CallDetails | null> {
  const db = createClient()
  const tenantId = process.env.DEMO_TENANT_ID
  
  if (!tenantId) {
    throw new Error('DEMO_TENANT_ID not configured')
  }

  try {
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

    return {
      call,
      toolResults: toolResults || []
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
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatCost(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function getOutcomeColor(outcome: string | null): string {
  switch (outcome) {
    case 'completed': return 'text-green-600 bg-green-100'
    case 'booked': return 'text-blue-600 bg-blue-100'
    case 'handoff': return 'text-purple-600 bg-purple-100'
    case 'failed': return 'text-red-600 bg-red-100'
    case 'abandoned': return 'text-yellow-600 bg-yellow-100'
    case 'no_answer': return 'text-gray-600 bg-gray-100'
    case 'busy': return 'text-orange-600 bg-orange-100'
    case 'unknown': return 'text-gray-600 bg-gray-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export default async function CallDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const callDetails = await getCallDetails(id)

  if (!callDetails) {
    notFound()
  }

  const { call, toolResults } = callDetails

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Call Details</h1>
        </div>

        {/* Call Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Call ID</h3>
            <p className="text-lg font-mono text-gray-900">{call.vapi_call_id}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Started</h3>
            <p className="text-lg text-gray-900">{formatDateTime(call.started_at)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Duration</h3>
            <p className="text-lg text-gray-900">{formatDuration(call.duration_sec)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Outcome</h3>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getOutcomeColor(call.outcome)}`}>
              {call.outcome || 'Unknown'}
            </span>
          </div>
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Cost</h3>
            <p className="text-lg text-gray-900">{formatCost(call.cost_cents)}</p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Transcript</h3>
            {call.transcript_url ? (
              <a 
                href={call.transcript_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                View Transcript
              </a>
            ) : (
              <p className="text-gray-500 text-sm">No transcript available</p>
            )}
          </div>
        </div>

        {/* Tool Results */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Tool Results ({toolResults.length})</h2>
          </div>
          <div className="p-6">
            {toolResults.length === 0 ? (
              <p className="text-gray-500">No tool calls recorded for this call.</p>
            ) : (
              <div className="space-y-6">
                {toolResults.map((result, index) => (
                  <div key={result.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium text-gray-900">
                        Tool Call #{index + 1}: {result.tool_name}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          result.success ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                        }`}>
                          {result.success ? 'Success' : 'Failed'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDateTime(result.created_at)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Request
                        </h4>
                        <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">
                          {JSON.stringify(result.request_json, null, 2)}
                        </pre>
                      </div>
                      
                      <div>
                        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                          Response
                        </h4>
                        <pre className="bg-gray-50 rounded p-3 text-xs overflow-x-auto">
                          {JSON.stringify(result.response_json, null, 2)}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Raw Data */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Raw Call Data</h2>
          </div>
          <div className="p-6">
            <pre className="bg-gray-50 rounded p-4 text-xs overflow-x-auto">
              {JSON.stringify(call.raw_json, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
