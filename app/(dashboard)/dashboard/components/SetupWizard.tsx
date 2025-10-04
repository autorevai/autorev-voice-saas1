'use client'

import { useState } from 'react'
import { X, Phone, MapPin, Clock, Building, ExternalLink, Smartphone } from 'lucide-react'
import { useTenant } from '@/lib/tenant-context'

interface SetupWizardProps {
  onComplete?: () => void
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ assistantId: string; phoneNumber: string } | null>(null)
  const { currentTenant } = useTenant()
  const [formData, setFormData] = useState({
    serviceArea: '',
    serviceHours: '',
    phoneNumber: '',
    forwardingNumber: '',
    googleBusinessProfile: '',
    industry: ''
  })

  const validateForm = () => {
    if (!formData.serviceArea.trim()) {
      setError('Service area is required')
      return false
    }
    if (!formData.serviceHours.trim()) {
      setError('Business hours are required')
      return false
    }
    if (!formData.phoneNumber.trim()) {
      setError('Business phone number is required')
      return false
    }
    if (!formData.forwardingNumber.trim()) {
      setError('Forwarding number is required')
      return false
    }
    if (!formData.industry) {
      setError('Industry selection is required')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      if (!validateForm()) {
        setLoading(false)
        return
      }

      if (!currentTenant) {
        throw new Error('No tenant found. Please refresh and try again.')
      }

      // Call the provisioning API
      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant.id,
          businessName: currentTenant.business_name,
          market: formData.industry || 'hvac',
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to provision assistant')
      }

      if (!result.success) {
        throw new Error(result.error || 'Provisioning failed')
      }

      setSuccess({
        assistantId: result.assistantId,
        phoneNumber: result.phoneNumber
      })

      // Close wizard after a short delay to show success
      setTimeout(() => {
        setIsOpen(false)
        onComplete?.()
      }, 3000)

    } catch (error) {
      console.error('Setup failed:', error)
      setError(error instanceof Error ? error.message : 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Service Area', icon: MapPin },
    { number: 2, title: 'Business Hours', icon: Clock },
    { number: 3, title: 'Contact Info', icon: Phone },
    { number: 4, title: 'Forwarding Number', icon: Smartphone },
    { number: 5, title: 'Business Profile', icon: Building }
  ]

  if (!isOpen) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Complete your setup
            </h2>
            <p className="text-gray-600 mb-4">
              Set up your AI voice agent in 2 minutes to start taking calls automatically
            </p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <MapPin className="w-4 h-4 mr-1" />
                Service area
              </div>
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                Business hours
              </div>
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-1" />
                Phone number
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Configure
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Setup Wizard</h2>
            <p className="text-gray-600">Configure your AI voice agent</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b">
          <div className="flex items-center space-x-4">
            {steps.map((step) => {
              const Icon = step.icon
              const isActive = currentStep === step.number
              const isCompleted = currentStep > step.number
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    isCompleted 
                      ? 'bg-green-100 text-green-600' 
                      : isActive 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? '✓' : step.number}
                  </div>
                  <div className="ml-2">
                    <div className={`text-sm font-medium ${
                      isActive ? 'text-gray-900' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </div>
                  </div>
                  {step.number < steps.length && (
                    <div className={`w-8 h-0.5 mx-4 ${
                      isCompleted ? 'bg-green-200' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-6 mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="mx-6 mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">Setup Complete!</h3>
                <div className="mt-2 text-sm text-green-700">
                  <p><strong>Assistant ID:</strong> {success.assistantId}</p>
                  <p><strong>Phone Number:</strong> {success.phoneNumber}</p>
                  <p className="mt-1">Your AI voice agent is now ready to take calls!</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Area (ZIP codes)
                </label>
                <textarea
                  value={formData.serviceArea}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceArea: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter ZIP codes separated by commas (e.g., 12345, 67890, 11111)"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Hours
                </label>
                <textarea
                  value={formData.serviceHours}
                  onChange={(e) => setFormData(prev => ({ ...prev, serviceHours: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Monday-Friday 8AM-6PM, Saturday 9AM-4PM, Emergency 24/7"
                  rows={3}
                />
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 123-4567"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Your business phone number for customer reference
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Forwarding Number
                </label>
                <input
                  type="tel"
                  value={formData.forwardingNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, forwardingNumber: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="(555) 987-6543"
                />
                <p className="text-sm text-gray-500 mt-1">
                  This number will receive forwarded calls from your AI agent when customers need to speak to a human
                </p>
              </div>
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry/Service Type
                </label>
                <select
                  value={formData.industry}
                  onChange={(e) => setFormData(prev => ({ ...prev, industry: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select your industry</option>
                  <option value="hvac">HVAC/Heating & Cooling</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="cleaning">Cleaning Services</option>
                  <option value="automotive">Automotive</option>
                  <option value="home-repair">Home Repair</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Google Business Profile <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="url"
                  value={formData.googleBusinessProfile}
                  onChange={(e) => setFormData(prev => ({ ...prev, googleBusinessProfile: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://g.page/your-business"
                />
                <p className="text-sm text-gray-500 mt-1">
                  Helps the AI provide accurate business information
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8">
            <button
              type="button"
              onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
              disabled={currentStep === 1}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Back
            </button>
            
            {currentStep < steps.length ? (
              <button
                type="button"
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading || success}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Setting up...' : success ? 'Setup Complete!' : 'Complete Setup'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
