'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { PLAYBOOK_TEMPLATES } from '@/lib/playbooks'
import { ArrowLeft, ArrowRight, Check, Copy, Phone, MapPin, Building, Wrench, Heart, Scale, Stethoscope, Home, Trees, Waves } from 'lucide-react'
import type { Industry, BusinessProfile } from '@/lib/types/provisioning'

const industryIcons = {
  hvac: Wrench,
  plumbing: Wrench,
  electrical: Wrench,
  roofing: Home,
  landscaping: Trees,
  pool_service: Waves,
  dental: Heart,
  legal: Scale,
  medical: Stethoscope
}


export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ 
    phoneNumber: string | null, 
    assistantId: string, 
    phoneProvisioningFailed?: boolean 
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const [progressText, setProgressText] = useState('')
  const { currentTenant } = useTenant()
  const router = useRouter()

  const [formData, setFormData] = useState<BusinessProfile>({
    industry: 'hvac',
    serviceArea: [],
    businessHours: {
      weekdays: '8am-6pm',
      weekends: 'closed',
      emergency: false,
      emergencyPhone: ''
    },
    emergencyKeywords: [],
    routingConfig: {}
  })

  const [businessPhone, setBusinessPhone] = useState('')

  const [zipCode, setZipCode] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setProgress(0)

    try {
      if (!currentTenant) {
        throw new Error('No tenant found. Please refresh and try again.')
      }

      if (!businessPhone.trim()) {
        throw new Error('Business phone number is required')
      }

      // Real progress updates
      setProgressText('Creating your AI receptionist...')
      setProgress(25)
      
      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          businessHours: {
            ...formData.businessHours,
            emergencyPhone: businessPhone.trim()
          },
          businessPhone: businessPhone.trim()
        })
      })

      setProgressText('Finalizing setup...')
      setProgress(75)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Provisioning failed')
      }

      setProgressText('Complete!')
      setProgress(100)

      // Store result
      setResult({ 
        phoneNumber: data.phoneNumber || null,
        assistantId: data.assistantId,
        phoneProvisioningFailed: data.phoneProvisioningFailed || false
      })

      // Auto-redirect after 3 seconds
      setTimeout(() => {
        router.push('/dashboard?setup=complete')
        router.refresh()
      }, 3000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addZipCode = () => {
    if (zipCode.trim() && !formData.serviceArea.includes(zipCode.trim())) {
      setFormData(prev => ({
        ...prev,
        serviceArea: [...prev.serviceArea, zipCode.trim()]
      }))
      setZipCode('')
    }
  }

  const removeZipCode = (zip: string) => {
    setFormData(prev => ({
      ...prev,
      serviceArea: prev.serviceArea.filter(z => z !== zip)
    }))
  }

  const copyPhoneNumber = async () => {
    if (result?.phoneNumber) {
      try {
        await navigator.clipboard.writeText(result.phoneNumber)
      } catch (err) {
        console.error('Failed to copy:', err)
      }
    }
  }

  // Step 1: Industry Selection
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">Setup Your AI Receptionist</h1>
            <p className="text-xl text-gray-600">Choose your industry to get started</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(PLAYBOOK_TEMPLATES).map(([key, playbook]) => {
              const Icon = industryIcons[key as keyof typeof industryIcons]
              return (
                <div
                  key={key}
                  className="p-8 cursor-pointer hover:border-blue-500 hover:shadow-lg transition-all duration-200 bg-white rounded-lg border border-gray-200"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, industry: key as Industry }))
                    setStep(2)
                  }}
                >
                  <div className="text-center">
                    <Icon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                    <h3 className="font-semibold text-xl mb-2">{playbook.name}</h3>
                    <p className="text-gray-600">{playbook.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // Step 2: Service Area
  if (step === 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Area</h1>
            <p className="text-lg text-gray-600">Where do you provide services?</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  ZIP Codes
                </label>
                <div className="flex gap-2">
                  <input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="Enter ZIP code"
                    onKeyPress={(e) => e.key === 'Enter' && addZipCode()}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button 
                    onClick={addZipCode} 
                    disabled={!zipCode.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                </div>
              </div>

              {formData.serviceArea.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Service Areas
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {formData.serviceArea.map((zip) => (
                      <span
                        key={zip}
                        className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {zip}
                        <button
                          onClick={() => removeZipCode(zip)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between">
                <button 
                  onClick={() => setStep(1)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={formData.serviceArea.length === 0}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }


  // Step 3: Business Phone
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Business Phone Number</h1>
            <p className="text-lg text-gray-600">Where should we forward calls when customers need to speak to a human?</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Business Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-500 mt-2">
                  This is where VAPI will forward calls when customers need to speak to a real person.
                </p>
              </div>

              <div className="flex justify-between">
                <button 
                  onClick={() => setStep(2)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <button 
                  onClick={() => setStep(4)}
                  disabled={!businessPhone.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Step 4: Review & Provision
  if (step === 4) {
    const playbook = PLAYBOOK_TEMPLATES[formData.industry]
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Review & Provision</h1>
            <p className="text-lg text-gray-600">Review your settings and create your AI receptionist</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-lg mb-4">Configuration Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Business:</span>
                    <span className="font-medium">{currentTenant?.name || 'Loading...'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Industry:</span>
                    <span className="font-medium">{playbook.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Service Areas:</span>
                    <span className="font-medium">{formData.serviceArea.join(', ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Forwarding Number:</span>
                    <span className="font-medium">{businessPhone}</span>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              <div className="flex justify-between">
                <button 
                  onClick={() => setStep(3)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <button 
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create AI Receptionist'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Setting Up Your AI</h1>
            <p className="text-lg text-gray-600">{progressText}</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Success Screen
  if (result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-xl p-8">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {result.phoneProvisioningFailed ? 'Assistant Created!' : 'Your AI Receptionist is Live!'}
              </h1>
              <p className="text-gray-600">
                {result.phoneProvisioningFailed 
                  ? 'Add a phone number to start taking calls' 
                  : 'Redirecting to dashboard...'}
              </p>
            </div>

            {/* Phone Number Display OR Manual Instructions */}
            {result.phoneNumber ? (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6">
                <p className="text-white text-sm font-medium mb-2">Customer Phone Number</p>
                <div className="flex items-center justify-between">
                  <p className="text-white text-3xl font-bold font-mono">
                    {result.phoneNumber}
                  </p>
                  <button
                    onClick={() => {
                      if (result.phoneNumber) {
                        navigator.clipboard.writeText(result.phoneNumber);
                      }
                    }}
                    className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
                <h3 className="font-semibold text-yellow-900 mb-2">Phone Number Needed</h3>
                <p className="text-yellow-800 text-sm mb-4">
                  We couldn't automatically provision a phone number. You can add one manually:
                </p>
                <ol className="text-sm text-yellow-800 space-y-2 mb-4">
                  <li>1. Go to <a href="https://dashboard.vapi.ai/phone-numbers" target="_blank" className="underline">VAPI Phone Numbers</a></li>
                  <li>2. Click "Create Phone Number"</li>
                  <li>3. Select your assistant: {result.assistantId}</li>
                  <li>4. Save the number</li>
                </ol>
                
                <a
                  href="https://dashboard.vapi.ai/phone-numbers"
                  target="_blank"
                  className="inline-block bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  Add Phone Number in VAPI
                </a>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 mb-6">
              {result.phoneNumber && (
                <a
                  href={`tel:${result.phoneNumber}`}
                  className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
                >
                  Test Call Now
                </a>
              )}
              
              <button
                onClick={() => {
                  router.push('/dashboard');
                  router.refresh(); // Refresh to load new assistant data
                }}
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>
            </div>

            {/* Next Steps */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li className="flex items-start">
                  <span className="text-yellow-600 mr-2">!</span>
                  <span>
                    <strong>CRITICAL:</strong> Publish assistant in VAPI dashboard
                    <br />
                    <a href={`https://dashboard.vapi.ai/assistants/${result.assistantId}`} target="_blank" className="text-blue-600 underline">
                      Click here to publish
                    </a>
                  </span>
                </li>
                {result.phoneNumber && (
                  <>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Phone number: {result.phoneNumber}</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-blue-600 mr-2">→</span>
                      <span>Test the assistant by calling and booking an appointment</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      <span>Add this number to your website and business cards</span>
                    </li>
                  </>
                )}
                <li className="flex items-start">
                  <span className="text-green-600 mr-2">✓</span>
                  <span>Check the dashboard to see calls and bookings in real-time</span>
                </li>
              </ul>
            </div>

            {/* Assistant Details */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500 text-center">
                Assistant ID: {result.assistantId}
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
