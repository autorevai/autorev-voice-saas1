'use client'

import { useState, useEffect } from 'react'
import { X, Zap, Clock, CreditCard } from 'lucide-react'

interface TrialBannerProps {
  onDismiss?: () => void
}

interface TrialData {
  status: 'trialing' | 'active' | 'past_due' | 'canceled'
  trialEndsAt: string | null
  planTier: string
  daysRemaining: number
}

export default function TrialBanner({ onDismiss }: TrialBannerProps) {
  const [trialData, setTrialData] = useState<TrialData | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if banner was previously dismissed (today)
    const dismissedDate = localStorage.getItem('trialBannerDismissed')
    if (dismissedDate) {
      const today = new Date().toDateString()
      if (dismissedDate === today) {
        setDismissed(true)
        setLoading(false)
        return
      }
    }

    fetchTrialStatus()
  }, [])

  const fetchTrialStatus = async () => {
    try {
      const response = await fetch('/api/subscription/status')
      if (response.ok) {
        const data = await response.json()
        
        // Calculate days remaining
        if (data.trialEndsAt) {
          const daysRemaining = Math.ceil(
            (new Date(data.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
          setTrialData({ ...data, daysRemaining })
        }
      }
    } catch (error) {
      console.error('Failed to fetch trial status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('trialBannerDismissed', new Date().toDateString())
    onDismiss?.()
  }

  // Don't show if dismissed or loading
  if (dismissed || loading) return null

  // Don't show if no trial data or not in trial
  if (!trialData || trialData.status !== 'trialing') return null

  // Don't show if trial ended
  if (trialData.daysRemaining <= 0) return null

  const isUrgent = trialData.daysRemaining <= 3

  return (
    <div className={`relative rounded-lg p-4 mb-6 ${
      isUrgent 
        ? 'bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200' 
        : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200'
    }`}>
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="flex items-start space-x-4">
        {/* Icon */}
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
          isUrgent ? 'bg-red-100' : 'bg-blue-100'
        }`}>
          {isUrgent ? (
            <Clock className={`w-6 h-6 ${isUrgent ? 'text-red-600' : 'text-blue-600'}`} />
          ) : (
            <Zap className="w-6 h-6 text-blue-600" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`font-bold text-lg ${
            isUrgent ? 'text-red-900' : 'text-blue-900'
          }`}>
            {isUrgent 
              ? `Only ${trialData.daysRemaining} ${trialData.daysRemaining === 1 ? 'day' : 'days'} left in your trial!`
              : `${trialData.daysRemaining} days left in your free trial`
            }
          </h3>
          <p className={`text-sm mt-1 ${
            isUrgent ? 'text-red-700' : 'text-blue-700'
          }`}>
            You're currently on the <strong>{trialData.planTier.charAt(0).toUpperCase() + trialData.planTier.slice(1)}</strong> plan. 
            {isUrgent 
              ? ' Add a payment method now to avoid service interruption.'
              : ' Add a payment method to continue after your trial ends.'
            }
          </p>

          {/* CTA Buttons */}
          <div className="flex gap-3 mt-4">
            <a
              href="/pricing"
              className={`inline-flex items-center px-4 py-2 rounded-lg font-semibold transition-colors ${
                isUrgent
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Add Payment Method
            </a>
            <a
              href="/pricing"
              className="inline-flex items-center px-4 py-2 border-2 border-gray-300 bg-white rounded-lg text-gray-700 hover:bg-gray-50 font-semibold transition-colors"
            >
              View Plans
            </a>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-gray-600 mb-1">
          <span>Trial progress</span>
          <span>{14 - trialData.daysRemaining} of 14 days used</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isUrgent ? 'bg-red-500' : 'bg-blue-500'
            }`}
            style={{ width: `${((14 - trialData.daysRemaining) / 14) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
