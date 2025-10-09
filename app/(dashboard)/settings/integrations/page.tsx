'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, Check, AlertCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function IntegrationsPage() {
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [disconnecting, setDisconnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkConnection()
  }, [])

  async function checkConnection() {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('Not authenticated')
        setLoading(false)
        return
      }

      // Check if user has Google tokens
      const { data } = await supabase
        .from('users')
        .select('google_access_token')
        .eq('id', user.id)
        .single()

      setConnected(!!data?.google_access_token)
    } catch (err) {
      console.error('Failed to check connection:', err)
      setError('Failed to check connection status')
    } finally {
      setLoading(false)
    }
  }

  function handleConnect() {
    // Redirect to Google OAuth flow
    window.location.href = '/api/auth/google/connect'
  }

  async function handleDisconnect() {
    if (!confirm('Are you sure you want to disconnect Google Calendar? Future bookings will not be automatically added to your calendar.')) {
      return
    }

    setDisconnecting(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('Not authenticated')
      }

      // Clear Google tokens from database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          google_access_token: null,
          google_refresh_token: null,
          google_token_expires_at: null,
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      setConnected(false)
    } catch (err: any) {
      console.error('Failed to disconnect:', err)
      setError(err.message || 'Failed to disconnect')
    } finally {
      setDisconnecting(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations</h1>
        <p className="text-gray-600">
          Connect third-party services to enhance your AutoRev experience
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-900">{error}</p>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle>Google Calendar</CardTitle>
                <CardDescription className="mt-1">
                  Automatically add bookings to your Google Calendar
                </CardDescription>
                {connected && (
                  <div className="flex items-center mt-3 text-sm text-green-600 font-medium">
                    <Check className="w-4 h-4 mr-2" />
                    Connected
                  </div>
                )}
              </div>
            </div>

            {!connected ? (
              <Button
                onClick={handleConnect}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Loading...' : 'Connect Calendar'}
              </Button>
            ) : (
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
              >
                {disconnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Disconnecting...
                  </>
                ) : (
                  'Disconnect'
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        {connected && (
          <CardContent>
            <div className="pt-6 border-t border-gray-200">
              <h4 className="font-medium mb-3">What gets synced:</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                  New bookings automatically create calendar events
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                  Customer details added to event description
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                  1-hour and 24-hour email reminders
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />
                  AI checks your calendar availability before suggesting times
                </li>
              </ul>
            </div>
          </CardContent>
        )}

        {!connected && (
          <CardContent>
            <div className="pt-6 border-t border-gray-200">
              <h4 className="font-medium mb-3">Why connect your calendar?</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start">
                  <span className="font-semibold mr-2 text-gray-900">•</span>
                  <span><strong>Prevent double-bookings:</strong> AI checks your calendar before suggesting appointment times</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2 text-gray-900">•</span>
                  <span><strong>Auto-sync bookings:</strong> New appointments automatically appear in Google Calendar</span>
                </li>
                <li className="flex items-start">
                  <span className="font-semibold mr-2 text-gray-900">•</span>
                  <span><strong>Never miss appointments:</strong> Get reminders on your phone and email</span>
                </li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
