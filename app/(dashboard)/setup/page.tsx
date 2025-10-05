'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTenant } from '@/lib/tenant-context'
import { PLAYBOOK_TEMPLATES } from '@/lib/playbooks'
import { ArrowLeft, ArrowRight, Check, Copy, Phone, MapPin, Clock, Users, Building, Wrench, Heart, Scale, Stethoscope } from 'lucide-react'
import type { Industry, BusinessProfile } from '@/lib/types/provisioning'

const industryIcons = {
  hvac: Wrench,
  plumbing: Wrench,
  electrical: Wrench,
  dental: Heart,
  legal: Scale,
  medical: Stethoscope
}

const hourPresets = [
  { label: '9 AM - 5 PM', value: '9am-5pm' },
  { label: '8 AM - 6 PM', value: '8am-6pm' },
  { label: '7 AM - 7 PM', value: '7am-7pm' },
  { label: '24/7 Emergency', value: '24/7' },
  { label: 'Custom', value: 'custom' }
]

export default function SetupPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ phoneNumber: string } | null>(null)
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
      emergency: false
    },
    emergencyKeywords: [],
    routingConfig: {}
  })

  const [businessPhone, setBusinessPhone] = useState('')

  const [zipCode, setZipCode] = useState('')
  const [customHours, setCustomHours] = useState('')

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

      // Simulate progress
      setProgressText('Creating your AI receptionist...')
      setProgress(33)
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProgressText('Generating custom playbook...')
      setProgress(66)
      await new Promise(resolve => setTimeout(resolve, 1000))

      setProgressText('Provisioning phone number...')
      setProgress(100)
      await new Promise(resolve => setTimeout(resolve, 1000))

      const response = await fetch('/api/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          businessPhone: businessPhone.trim()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Provisioning failed')
      }

      setResult({ phoneNumber: data.phoneNumber })
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

  // Step 3: Business Hours
  if (step === 3) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Business Hours</h1>
            <p className="text-lg text-gray-600">When are you available for appointments?</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Weekday Hours
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {hourPresets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        if (preset.value === 'custom') {
                          setFormData(prev => ({ ...prev, businessHours: { ...prev.businessHours, weekdays: customHours } }))
                        } else {
                          setFormData(prev => ({ ...prev, businessHours: { ...prev.businessHours, weekdays: preset.value } }))
                        }
                      }}
                      className={`p-3 text-left rounded-md border transition-colors ${
                        formData.businessHours.weekdays === preset.value 
                          ? 'border-blue-500 bg-blue-50 text-blue-700' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {formData.businessHours.weekdays === 'custom' && (
                <div>
                  <input
                    value={customHours}
                    onChange={(e) => setCustomHours(e.target.value)}
                    placeholder="e.g., Monday-Friday 8AM-6PM"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Weekend Hours
                </label>
                <select
                  value={formData.businessHours.weekends}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessHours: { ...prev.businessHours, weekends: e.target.value } }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="closed">Closed</option>
                  <option value="9am-5pm">9 AM - 5 PM</option>
                  <option value="8am-6pm">8 AM - 6 PM</option>
                  <option value="emergency">Emergency Only</option>
                </select>
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
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
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

  // Step 4: Business Phone
  if (step === 4) {
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
                  onClick={() => setStep(3)}
                  className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </button>
                <button 
                  onClick={() => setStep(5)}
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

  // Step 5: Review & Provision
  if (step === 5) {
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
                    <span className="text-gray-600">Business Hours:</span>
                    <span className="font-medium">{formData.businessHours.weekdays}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weekend Hours:</span>
                    <span className="font-medium">{formData.businessHours.weekends}</span>
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
                  onClick={() => setStep(4)}
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Receptionist Ready!</h1>
            <p className="text-lg text-gray-600">Your AI receptionist is now live and ready to take calls</p>
          </div>

          <div className="p-8 bg-white rounded-lg border border-gray-200">
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Customer Phone Number</h3>
                <div className="text-4xl font-mono font-bold text-blue-600 mb-4">
                  {result.phoneNumber}
                </div>
                <button 
                  onClick={copyPhoneNumber} 
                  className="flex items-center mx-auto px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Number
                </button>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Next Steps:</h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Add this number to your website and business cards</li>
                    <li>• Monitor calls in real-time on your dashboard</li>
                    <li>• Check the "Bookings" tab to see scheduled appointments</li>
                    <li>• Customize your AI's responses in settings</li>
                  </ul>
                </div>
              </div>

              <button 
                onClick={() => router.push('/dashboard')}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
