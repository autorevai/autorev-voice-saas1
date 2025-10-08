// app/(dashboard)/dashboard/components/TrialStatusBanner.tsx
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Phone, Clock, TrendingUp, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface TrialStatusBannerProps {
  tenant: {
    trial_calls_used: number
    trial_minutes_used: number
    stripe_trial_end: string
    stripe_subscription_status: string
  }
  variant: {
    name: string
    limits: {
      calls: number
      minutes: number
    }
  }
  plan: {
    name: string
    price: number
  }
}

export function TrialStatusBanner({ tenant, variant, plan }: TrialStatusBannerProps) {
  const [upgrading, setUpgrading] = useState(false)
  const router = useRouter()

  if (tenant.stripe_subscription_status !== 'trialing') {
    return null // Not in trial
  }

  const callsRemaining = Math.max(0, variant.limits.calls - tenant.trial_calls_used)
  const minutesRemaining = Math.max(0, variant.limits.minutes - tenant.trial_minutes_used)
  
  const trialEnd = new Date(tenant.stripe_trial_end)
  const daysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const callsPercent = (tenant.trial_calls_used / variant.limits.calls) * 100
  const minutesPercent = (tenant.trial_minutes_used / variant.limits.minutes) * 100
  const limitsClose = callsRemaining <= 2 || minutesRemaining <= 5

  const handleUpgrade = async () => {
    setUpgrading(true)
    const res = await fetch('/api/trial/upgrade-now', { method: 'POST' })
    if (res.ok) {
      router.refresh()
    }
    setUpgrading(false)
  }

  return (
    <Card className={`mb-6 ${limitsClose ? 'border-yellow-300 bg-yellow-50' : 'border-blue-200 bg-blue-50'}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-3">
              {limitsClose ? (
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              ) : (
                <TrendingUp className="w-5 h-5 text-blue-600 mr-2" />
              )}
              <h3 className={`font-semibold ${limitsClose ? 'text-yellow-900' : 'text-blue-900'}`}>
                {limitsClose ? '⚠️ Trial Limits Running Low' : '🎉 Trial Active'}
              </h3>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Calls Remaining */}
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Phone className="w-4 h-4 mr-1" />
                  Calls
                </div>
                <div className="flex items-baseline">
                  <span className={`text-2xl font-bold ${limitsClose ? 'text-yellow-900' : 'text-blue-900'}`}>
                    {callsRemaining}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    / {variant.limits.calls}
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      callsPercent >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${callsPercent}%` }}
                  />
                </div>
              </div>

              {/* Minutes Remaining */}
              <div>
                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <Clock className="w-4 h-4 mr-1" />
                  Minutes
                </div>
                <div className="flex items-baseline">
                  <span className={`text-2xl font-bold ${limitsClose ? 'text-yellow-900' : 'text-blue-900'}`}>
                    {minutesRemaining.toFixed(0)}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">
                    / {variant.limits.minutes}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      minutesPercent >= 80 ? 'bg-yellow-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${minutesPercent}%` }}
                  />
                </div>
              </div>

              {/* Days Remaining */}
              <div>
                <div className="text-sm text-gray-600 mb-1">Days Left</div>
                <div className="flex items-baseline">
                  <span className={`text-2xl font-bold ${limitsClose ? 'text-yellow-900' : 'text-blue-900'}`}>
                    {daysRemaining}
                  </span>
                  <span className="text-sm text-gray-600 ml-1">days</span>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Until {trialEnd.toLocaleDateString()}
                </div>
              </div>
            </div>

            {limitsClose && (
              <p className={`text-sm ${limitsClose ? 'text-yellow-800' : 'text-blue-800'} mb-4`}>
                You're almost out of trial limits! Upgrade now to keep using AutoRev without interruption.
              </p>
            )}

            <p className={`text-xs ${limitsClose ? 'text-yellow-700' : 'text-blue-700'}`}>
              Your {plan.name} plan (${plan.price}/mo) will automatically activate in {daysRemaining} days. Cancel anytime before then.
            </p>
          </div>

          {limitsClose && (
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              className="ml-4 bg-blue-600 hover:bg-blue-700"
            >
              {upgrading ? 'Upgrading...' : 'Upgrade Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


