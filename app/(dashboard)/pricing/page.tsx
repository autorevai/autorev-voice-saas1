// This file will replace pricing/page.tsx to fix the duplicate variable names

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check } from 'lucide-react'

const plans = [
  {
    tier: 'starter',
    name: 'Starter',
    price: 399,
    minutesIncluded: 500,
    features: [
      '500 minutes included',
      '24/7 AI receptionist',
      'Call recording & transcripts',
      'Appointment scheduling',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    tier: 'growth',
    name: 'Growth',
    price: 999,
    minutesIncluded: 1500,
    features: [
      '1,500 minutes included',
      'Everything in Starter',
      'Advanced analytics',
      'CRM integrations',
      'Priority support',
      'Custom voice training',
    ],
    popular: true,
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 2499,
    minutesIncluded: 5000,
    features: [
      '5,000 minutes included',
      'Everything in Growth',
      'Dedicated account manager',
      'White-label options',
      '24/7 phone support',
      'Custom integrations',
    ],
  },
]

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planTier: string) => {
    setLoading(planTier)

    try {
      // Get the actual tenant ID from the user's session
      const tenantResponse = await fetch('/api/user/tenant')
      const tenantData = await tenantResponse.json()

      if (!tenantResponse.ok) {
        throw new Error(tenantData.error || 'Failed to get tenant ID')
      }

      const tenantId = tenantData.tenantId

      // Create checkout session
      const checkoutResponse = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planTier,
          tenantId
        })
      })

      const checkoutData = await checkoutResponse.json()

      if (checkoutData.url) {
        window.location.href = checkoutData.url
      } else {
        console.error('No checkout URL returned:', checkoutData)
        alert('Failed to start checkout. Please try again.')
      }
    } catch (error) {
      console.error('Checkout error:', error)
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose the plan that fits your business. All plans include a 14-day free trial.
          </p>
        </div>

        {/* Trial Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-12 max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            ✨ Start Your Free Trial
          </h3>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              14 days free - no credit card required
            </li>
            <li className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              10 test calls included
            </li>
            <li className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              Up to 25 minutes total
            </li>
            <li className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              Full AI receptionist features
            </li>
            <li className="flex items-center">
              <Check className="w-5 h-5 mr-2" />
              Cancel anytime
            </li>
          </ul>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan) => (
            <Card
              key={plan.tier}
              className={`relative ${
                plan.popular ? 'border-2 border-blue-500 shadow-xl' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>
                  <div className="mt-4 mb-2">
                    <span className="text-4xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {plan.minutesIncluded.toLocaleString()} minutes included
                  </p>
                  <p className="text-xs text-gray-500">
                    $0.15/min overage
                  </p>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  onClick={() => handleSubscribe(plan.tier)}
                  disabled={loading === plan.tier}
                  className={`w-full py-3 px-4 rounded-lg font-semibold mb-6 transition-colors ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === plan.tier ? 'Loading...' : 'Start Free Trial'}
                </button>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="text-center text-gray-600 max-w-2xl mx-auto">
          <p className="mb-4">
            All plans include unlimited incoming calls. Pay only for the minutes you use.
          </p>
          <p className="text-sm">
            Need a custom plan for enterprise? <a href="mailto:sales@autorev.com" className="text-blue-600 hover:underline">Contact sales</a>
          </p>
        </div>
      </div>
    </div>
  )
}
