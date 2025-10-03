'use client'

import { useState } from 'react'
import { createTenant } from './actions'

interface OnboardingData {
  // Step 1
  companyName: string
  slug: string
  
  // Step 2
  email: string
  phone: string
  serviceHours: string
  
  // Step 3
  zipCodes: string
}

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<OnboardingData>({
    companyName: '',
    slug: '',
    email: '',
    phone: '',
    serviceHours: '',
    zipCodes: ''
  })
  const [errors, setErrors] = useState<Partial<OnboardingData>>({})

  // Auto-generate slug from company name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }

    // Auto-generate slug when company name changes
    if (field === 'companyName') {
      setFormData(prev => ({
        ...prev,
        slug: generateSlug(value)
      }))
    }
  }

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<OnboardingData> = {}

    if (step === 1) {
      if (!formData.companyName.trim()) {
        newErrors.companyName = 'Company name is required'
      }
      if (!formData.slug.trim()) {
        newErrors.slug = 'Slug is required'
      } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
        newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens'
      }
    } else if (step === 2) {
      if (!formData.email.trim()) {
        newErrors.email = 'Email is required'
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        newErrors.email = 'Please enter a valid email address'
      }
      if (!formData.phone.trim()) {
        newErrors.phone = 'Phone number is required'
      }
      if (!formData.serviceHours.trim()) {
        newErrors.serviceHours = 'Service hours description is required'
      }
    } else if (step === 3) {
      if (!formData.zipCodes.trim()) {
        newErrors.zipCodes = 'At least one ZIP code is required'
      } else {
        const zipList = formData.zipCodes.split(',').map(zip => zip.trim())
        const invalidZips = zipList.filter(zip => !/^\d{5}$/.test(zip))
        if (invalidZips.length > 0) {
          newErrors.zipCodes = 'All ZIP codes must be 5 digits'
        }
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3))
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async () => {
    if (validateStep(3)) {
      try {
        const result = await createTenant({
          businessName: formData.companyName,
          industry: 'Service Business', // Default industry - could be made configurable
          phone: formData.phone,
          serviceArea: formData.zipCodes,
          website: '', // Optional - could be added to form
          hoursOfOperation: formData.serviceHours
        })

        if (result.success) {
          alert(`Onboarding complete! Your tenant ID is: ${result.tenantId}`)
          // TODO: Redirect to dashboard or next step
        } else {
          alert(`Error: ${result.error}`)
        }
      } catch (error) {
        console.error('Error submitting onboarding:', error)
        alert('An unexpected error occurred. Please try again.')
      }
    }
  }

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Business Information</h2>
        <p className="text-gray-600">Tell us about your HVAC business</p>
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
          Company Name *
        </label>
        <input
          type="text"
          id="companyName"
          value={formData.companyName}
          onChange={(e) => handleInputChange('companyName', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.companyName ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="e.g., Anderson's Heating & Cooling"
        />
        {errors.companyName && (
          <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
        )}
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-2">
          Dashboard URL Slug *
        </label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
            autorev.ai/
          </span>
          <input
            type="text"
            id="slug"
            value={formData.slug}
            onChange={(e) => handleInputChange('slug', e.target.value)}
            className={`flex-1 px-3 py-2 border rounded-r-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.slug ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="andersons-heating-cooling"
          />
        </div>
        {errors.slug && (
          <p className="mt-1 text-sm text-red-600">{errors.slug}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Your dashboard will be available at: <span className="font-mono">autorev.ai/{formData.slug || 'your-slug'}</span>
        </p>
      </div>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Contact & Service</h2>
        <p className="text-gray-600">How customers can reach you</p>
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          id="email"
          value={formData.email}
          onChange={(e) => handleInputChange('email', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.email ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="contact@yourcompany.com"
        />
        {errors.email && (
          <p className="mt-1 text-sm text-red-600">{errors.email}</p>
        )}
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          value={formData.phone}
          onChange={(e) => handleInputChange('phone', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.phone ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="(614) 555-0123"
        />
        {errors.phone && (
          <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
        )}
      </div>

      <div>
        <label htmlFor="serviceHours" className="block text-sm font-medium text-gray-700 mb-2">
          Service Hours *
        </label>
        <textarea
          id="serviceHours"
          value={formData.serviceHours}
          onChange={(e) => handleInputChange('serviceHours', e.target.value)}
          rows={3}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.serviceHours ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Mon-Fri 8am-6pm, Sat 9am-4pm, Emergency service 24/7"
        />
        {errors.serviceHours && (
          <p className="mt-1 text-sm text-red-600">{errors.serviceHours}</p>
        )}
      </div>
    </div>
  )

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Service Areas</h2>
        <p className="text-gray-600">Where do you provide HVAC services?</p>
      </div>

      <div>
        <label htmlFor="zipCodes" className="block text-sm font-medium text-gray-700 mb-2">
          ZIP Codes *
        </label>
        <textarea
          id="zipCodes"
          value={formData.zipCodes}
          onChange={(e) => handleInputChange('zipCodes', e.target.value)}
          rows={4}
          className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
            errors.zipCodes ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="43004, 43017, 43026, 43035"
        />
        {errors.zipCodes && (
          <p className="mt-1 text-sm text-red-600">{errors.zipCodes}</p>
        )}
        <p className="mt-1 text-sm text-gray-500">
          Enter ZIP codes separated by commas. We'll use this to match customers in your service area.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to AutoRev</h1>
          <p className="mt-2 text-gray-600">Let's set up your HVAC voice AI assistant</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  step <= currentStep
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-4 ${
                    step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-2">
            Step {currentStep} of 3
          </p>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow rounded-lg p-8">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                currentStep === 1
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Back
            </button>

            {currentStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Complete Setup
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
