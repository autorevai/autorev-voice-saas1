'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, TrendingUp, Phone, Clock, RefreshCw } from 'lucide-react'

interface UsageData {
  minutesUsed: number
  minutesIncluded: number
  overageMinutes: number
  overageAmount: number
  periodEnd: string
  planTier: string
}

export default function UsageDashboard() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      setRefreshing(true)
      const response = await fetch('/api/usage/current')
      const data = await response.json()
      setUsage(data)
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!usage) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-3 text-amber-600" />
            <p className="text-amber-900">No active subscription found. Please choose a plan to get started.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const usagePercent = (usage.minutesUsed / usage.minutesIncluded) * 100
  const isNearLimit = usagePercent >= 80
  const isOverLimit = usagePercent >= 100
  const daysRemaining = Math.ceil((new Date(usage.periodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <div className="space-y-4">
      {/* Alert if near/over limit */}
      {isNearLimit && (
        <div className={`p-4 rounded-lg border ${
          isOverLimit 
            ? 'bg-red-50 border-red-200' 
            : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-start">
            <AlertCircle className={`w-5 h-5 mr-3 mt-0.5 ${
              isOverLimit ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div>
              <h3 className={`font-semibold ${
                isOverLimit ? 'text-red-900' : 'text-amber-900'
              }`}>
                {isOverLimit ? 'Overage charges apply' : 'Approaching minute limit'}
              </h3>
              <p className={`text-sm mt-1 ${
                isOverLimit ? 'text-red-700' : 'text-amber-700'
              }`}>
                {isOverLimit 
                  ? `You've used ${usage.overageMinutes} minutes over your plan limit. Overage charges: $${(usage.overageAmount / 100).toFixed(2)}`
                  : `You've used ${usagePercent.toFixed(0)}% of your included minutes for this billing period.`
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Usage Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Minutes Used */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Minutes Used
            </CardDescription>
            <CardTitle className="text-4xl font-extrabold text-blue-600">
              {usage.minutesUsed}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              of {usage.minutesIncluded} included
            </p>
            <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  isOverLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {usagePercent.toFixed(1)}% used
            </p>
          </CardContent>
        </Card>

        {/* Plan Tier */}
        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Current Plan
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-purple-600">
              {usage.planTier.charAt(0).toUpperCase() + usage.planTier.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-2">
              {usage.minutesIncluded} minutes/month
            </p>
            <a 
              href="/pricing" 
              className="text-sm text-purple-600 hover:underline font-medium inline-flex items-center"
            >
              Upgrade Plan →
            </a>
          </CardContent>
        </Card>

        {/* Billing Period */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider">
              Period Ends
            </CardDescription>
            <CardTitle className="text-xl font-bold text-green-600">
              {new Date(usage.periodEnd).toLocaleDateString()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600">
              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Resets on {new Date(usage.periodEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Overage Details (if applicable) */}
      {usage.overageMinutes > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Overage Charges</CardTitle>
            <CardDescription className="text-red-700">
              Additional minutes beyond your plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-red-900">
                  {usage.overageMinutes} minutes
                </p>
                <p className="text-sm text-red-700 mt-1">
                  @ $0.15/minute
                </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-red-900">
                  ${(usage.overageAmount / 100).toFixed(2)}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  Added to next invoice
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="flex gap-4">
        <button
          onClick={fetchUsage}
          disabled={refreshing}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Usage'}
        </button>
        <a 
          href="/billing"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          View Billing History
        </a>
      </div>
    </div>
  )
}
