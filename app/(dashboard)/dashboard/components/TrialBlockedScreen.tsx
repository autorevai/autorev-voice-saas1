// app/(dashboard)/dashboard/components/TrialBlockedScreen.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Check, Loader2, Sparkles, Clock, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface TrialBlockedScreenProps {
  tenant: {
    id: string
    name: string
    trial_calls_used: number
    trial_minutes_used: number
    trial_variant: string
    stripe_trial_end: string
  }
  variant: {
    name: string
    limits: {
      calls: number
      minutes: number
    }
    allowWaitForAutoConvert: boolean
  }
  plan: {
    name: string
    price: number
    minutesIncluded: number
    features: string[]
  }
}

export function TrialBlockedScreen({ tenant, variant, plan }: TrialBlockedScreenProps) {
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const trialEndDate = new Date(tenant.stripe_trial_end)
  const daysUntilAutoConvert = Math.ceil((trialEndDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  const handleUpgradeNow = async () => {
    setUpgrading(true)
    setError(null)

    try {
      const res = await fetch('/api/trial/upgrade-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const data = await res.json()

      if (res.ok) {
        // Success! Reload the page to show dashboard
        router.refresh()
      } else {
        setError(data.error || 'Failed to activate subscription')
      }
    } catch (err) {
      setError('Network error. Please try again.')
    } finally {
      setUpgrading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Main Card */}
        <Card className="border-2 border-blue-200 shadow-xl">
          <CardContent className="p-8 md:p-12">
            {/* Icon & Headline */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full mb-6">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                You're Loving AutoRev! 🎉
              </h1>
              
              <p className="text-xl text-gray-600 mb-2">
                You've used all <strong>{variant.limits.calls} trial calls</strong> and <strong>{variant.limits.minutes} trial minutes</strong>
              </p>
              
              <p className="text-lg text-gray-500">
                That means AutoRev is working great for {tenant.name}!
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8 p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <Phone className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-3xl font-bold text-gray-900">{tenant.trial_calls_used}</div>
                <div className="text-sm text-gray-600">Calls Made</div>
              </div>
              <div className="text-center">
                <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                <div className="text-3xl font-bold text-gray-900">
                  {tenant.trial_minutes_used.toFixed(1)}
                </div>
                <div className="text-sm text-gray-600">Minutes Used</div>
              </div>
            </div>

            {/* Plan Details */}
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-8 mb-8 text-white">
              <h3 className="text-2xl font-bold mb-4 text-center">
                Your {plan.name} Plan
              </h3>
              
              <div className="text-center mb-6">
                <div className="text-5xl font-bold">
                  ${plan.price}
                  <span className="text-2xl font-normal opacity-90">/month</span>
                </div>
                <div className="text-blue-100 mt-2">
                  Includes {plan.minutesIncluded} minutes per month
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start text-sm">
                    <Check className="w-5 h-5 mr-2 flex-shrink-0 text-blue-200" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-4">
              <Button
                onClick={handleUpgradeNow}
                disabled={upgrading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg py-6 rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                {upgrading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Activating Subscription...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Activate Subscription Now
                  </>
                )}
              </Button>

              {variant.allowWaitForAutoConvert && daysUntilAutoConvert > 0 && (
                <Button
                  variant="outline"
                  className="w-full py-6 text-gray-700 border-2 border-gray-300 hover:bg-gray-50"
                  disabled={upgrading}
                >
                  <Clock className="w-5 h-5 mr-2" />
                  Wait {daysUntilAutoConvert} More {daysUntilAutoConvert === 1 ? 'Day' : 'Days'} for Auto-Activation
                </Button>
              )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Fine Print */}
            <div className="mt-8 pt-8 border-t border-gray-200 text-center space-y-2">
              {variant.allowWaitForAutoConvert && daysUntilAutoConvert > 0 && (
                <p className="text-sm text-gray-600">
                  Your subscription will automatically activate on{' '}
                  <strong>{trialEndDate.toLocaleDateString()}</strong>
                </p>
              )}
              <p className="text-xs text-gray-500">
                Not ready yet?{' '}
                <a href="/settings/billing" className="text-blue-600 hover:underline">
                  Cancel your trial
                </a>{' '}
                (no charge)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* What You Get Section */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📞</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              {plan.minutesIncluded} Minutes
            </h3>
            <p className="text-sm text-gray-600">
              More than enough for your business needs
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">📅</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Unlimited Bookings
            </h3>
            <p className="text-sm text-gray-600">
              Book as many appointments as you can handle
            </p>
          </Card>

          <Card className="text-center p-6 hover:shadow-lg transition-shadow">
            <div className="text-4xl mb-3">💬</div>
            <h3 className="font-semibold text-gray-900 mb-2">
              Smart Features
            </h3>
            <p className="text-sm text-gray-600">
              SMS follow-ups, reminders, and more
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
