'use client'

import { useState } from 'react'
import { Check, Zap } from 'lucide-react'

const PLANS = {
  starter: {
    name: 'Starter',
    price: 399,
    minutesIncluded: 500,
    features: [
      'Single phone number',
      'Basic booking + CRM writes',
      'SMS confirmations',
      '500 minutes/month',
      'Business hours support'
    ]
  },
  growth: {
    name: 'Growth',
    price: 899,
    minutesIncluded: 1500,
    popular: true,
    features: [
      'Multi-number/brand support',
      'Missed-call rescue',
      'Text-to-pay deposits',
      'After-hours logic',
      '1,500 minutes/month',
      'Priority support'
    ]
  },
  pro: {
    name: 'Pro',
    price: 1799,
    minutesIncluded: 5000,
    features: [
      'Multi-location',
      'Advanced routing',
      'Bilingual support (EN/ES)',
      'Analytics exports',
      'Dedicated account manager',
      '5,000 minutes/month',
      'Custom integrations'
    ]
  }
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planTier: string) => {
    setLoading(planTier)
    
    try {
      // Get the actual tenant ID from the user's session
      const response = await fetch('/api/user/tenant')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to get tenant ID')
      }
      
      const tenantId = data.tenantId
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          planTier,
          tenantId
        })
      })

      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        console.error('No checkout URL returned:', data)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Never miss a call. Never lose a lead.
          </p>
          <p className="text-sm text-gray-500">
            All plans include 14-day free trial • No credit card required
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div
              key={key}
              className={`relative bg-white rounded-2xl shadow-xl ${
                plan.popular ? 'ring-2 ring-blue-500 transform scale-105' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                    <Zap className="w-4 h-4 mr-1" />
                    Most Popular
                  </span>
                </div>
              )}

              <div className="p-8">
                {/* Plan Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  {plan.name}
                </h3>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-5xl font-extrabold text-gray-900">
                    ${plan.price}
                  </span>
                  <span className="text-gray-600 ml-2">/month</span>
                  <p className="text-sm text-gray-500 mt-2">
                    {plan.minutesIncluded} minutes included
                  </p>
                  <p className="text-xs text-gray-400">
                    $0.15/min overage
                  </p>
                </div>

                {/* CTA Button */}
                <button
                  onClick={() => handleSubscribe(key)}
                  disabled={loading === key}
                  className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                    plan.popular
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                  } disabled:opacity-50`}
                >
                  {loading === key ? 'Loading...' : 'Start Free Trial'}
                </button>

                {/* Features */}
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 mb-4">
            Questions? Email us at{' '}
            <a href="mailto:sales@autorev.ai" className="text-blue-600 hover:underline">
              sales@autorev.ai
            </a>
          </p>
          <div className="inline-flex items-center space-x-6 text-sm text-gray-500">
            <span>✓ Cancel anytime</span>
            <span>✓ No setup fees</span>
            <span>✓ 14-day free trial</span>
          </div>
        </div>
      </div>
    </div>
  )
}
