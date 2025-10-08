'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Phone, Clock, AlertTriangle } from 'lucide-react'
import { TRIAL_LIMITS, getTrialUsagePercent, getTrialRemaining } from '@/lib/stripe/trial-limits'

interface TrialUsageData {
  minutesUsed: number
  minutesIncluded: number
  callsUsed: number
  callsIncluded: number
  limitExceeded?: boolean
  limitType?: 'minutes' | 'calls' | null
}

interface TrialUsageWidgetProps {
  usage: TrialUsageData
}

export default function TrialUsageWidget({ usage }: TrialUsageWidgetProps) {
  const minutesPercent = (usage.minutesUsed / usage.minutesIncluded) * 100
  const callsPercent = (usage.callsUsed / usage.callsIncluded) * 100

  const { percent: usagePercent, limitingFactor } = getTrialUsagePercent(usage.minutesUsed, usage.callsUsed)
  const { minutesRemaining, callsRemaining, closestToLimit } = getTrialRemaining(usage.minutesUsed, usage.callsUsed)

  const isUrgent = usagePercent >= 70
  const isCritical = usagePercent >= 90

  // Determine alert level
  const getAlertColor = (percent: number) => {
    if (percent >= 90) return 'bg-red-500'
    if (percent >= 70) return 'bg-amber-500'
    return 'bg-blue-500'
  }

  const getAlertBorder = () => {
    if (isCritical) return 'border-red-500'
    if (isUrgent) return 'border-amber-500'
    return 'border-blue-500'
  }

  const getAlertBadge = () => {
    if (usage.limitExceeded) return 'destructive'
    if (isCritical) return 'destructive'
    if (isUrgent) return 'secondary'
    return 'default'
  }

  return (
    <Card className={`border-2 ${getAlertBorder()}`}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="text-lg">Trial Usage</span>
          <Badge variant={getAlertBadge()}>
            {usage.limitExceeded
              ? 'Trial Ended'
              : `${callsRemaining} calls left`}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calls Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Calls</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.callsUsed} / {usage.callsIncluded}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getAlertColor(callsPercent)}`}
              style={{ width: `${Math.min(callsPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {callsRemaining} {callsRemaining === 1 ? 'call' : 'calls'} remaining
          </p>
        </div>

        {/* Minutes Progress */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium">Minutes</span>
            </div>
            <span className="text-sm text-gray-600">
              {usage.minutesUsed} / {usage.minutesIncluded}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${getAlertColor(minutesPercent)}`}
              style={{ width: `${Math.min(minutesPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {minutesRemaining} {minutesRemaining === 1 ? 'minute' : 'minutes'} remaining
          </p>
        </div>

        {/* Warning Messages */}
        {usage.limitExceeded && (
          <div className="pt-4 border-t border-red-200 bg-red-50 -mx-6 -mb-6 px-6 pb-6 rounded-b-lg">
            <div className="flex items-start space-x-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Trial Limit Reached
                </p>
                <p className="text-sm text-red-700">
                  You've used all {usage.limitType === 'calls' ? '10 trial calls' : '25 trial minutes'}.
                  Upgrade now to continue receiving calls.
                </p>
              </div>
            </div>
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium w-full justify-center transition-colors"
            >
              Upgrade Now →
            </a>
          </div>
        )}

        {!usage.limitExceeded && isUrgent && (
          <div className={`pt-4 border-t ${isCritical ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'} -mx-6 -mb-6 px-6 pb-6 rounded-b-lg`}>
            <div className="flex items-start space-x-2 mb-3">
              <AlertTriangle className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-amber-600'} flex-shrink-0 mt-0.5`} />
              <div>
                <p className={`text-sm font-semibold ${isCritical ? 'text-red-900' : 'text-amber-900'} mb-1`}>
                  {isCritical ? 'Almost Out!' : 'Running Low'}
                </p>
                <p className={`text-sm ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                  You're running low on trial {closestToLimit}. Add a payment method to avoid service interruption.
                </p>
              </div>
            </div>
            <a
              href="/pricing"
              className={`inline-flex items-center px-4 py-2 ${isCritical ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'} text-white rounded-lg font-medium w-full justify-center transition-colors`}
            >
              Upgrade to Continue →
            </a>
          </div>
        )}

        {!usage.limitExceeded && !isUrgent && (
          <div className="pt-4 border-t text-center">
            <p className="text-sm text-gray-600 mb-3">
              Enjoying your trial? Get unlimited calls with a paid plan.
            </p>
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors text-sm"
            >
              View Plans →
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
