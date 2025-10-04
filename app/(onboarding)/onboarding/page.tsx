'use client'

import { useState } from 'react'
import { createTenant } from './actions'
import { useRouter } from 'next/navigation'

interface OnboardingData {
  businessName: string
  website?: string
}

export default function OnboardingPage() {
  const [formData, setFormData] = useState<OnboardingData>({
    businessName: '',
    website: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.businessName.trim()) {
      setError('Business name is required')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await createTenant({
        businessName: formData.businessName.trim(),
        website: formData.website?.trim() || undefined,
      })

      if (result.success) {
        router.push('/dashboard')
      } else {
        setError(result.error || 'Failed to create account')
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to AutoRev
          </h1>
          <p className="text-gray-600">
            Let's get your AI voice agent set up in under 60 seconds
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm border p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                What's your business called?
              </label>
              <input
                id="businessName"
                type="text"
                value={formData.businessName}
                onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="e.g., Anderson's Heating & Cooling"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-2">
                Business website <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
                placeholder="https://yourbusiness.com"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !formData.businessName.trim()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg transition-colors"
            >
              {loading ? 'Creating your account...' : 'Continue'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            We'll collect service details and phone numbers in the next step
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>Already have an account? <a href="/login" className="text-blue-600 hover:underline">Sign in</a></p>
        </div>
      </div>
    </div>
  )
}