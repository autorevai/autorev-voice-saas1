'use client'

import { useState } from 'react'

interface PhoneNumberDisplayProps {
  phoneNumber: string
  assistantId: string
}

export default function PhoneNumberDisplay({ phoneNumber, assistantId }: PhoneNumberDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-8">
        {/* Success Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Your AI Receptionist is Live!
          </h2>
          <p className="text-gray-600">
            Your voice assistant is ready to take calls
          </p>
        </div>

        {/* Phone Number Display */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 mb-6">
          <p className="text-white text-sm font-medium mb-2">Customer Phone Number</p>
          <div className="flex items-center justify-between">
            <p className="text-white text-3xl font-bold font-mono">
              {phoneNumber}
            </p>
            <button
              onClick={handleCopy}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 mb-6">
          <a
            href={`tel:${phoneNumber}`}
            className="block w-full bg-green-600 hover:bg-green-700 text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"
          >
            Test Call Now
          </a>
        </div>

        {/* Quick Tips */}
        <div className="bg-white/50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Next Steps:</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Add this number to your website and business cards</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Test the assistant by calling and booking an appointment</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Check the dashboard to see calls and bookings in real-time</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-600 mr-2">✓</span>
              <span>Share the number with customers - your AI is ready!</span>
            </li>
          </ul>
        </div>

        {/* Assistant Details */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Assistant ID: {assistantId}
          </p>
        </div>
      </div>
    </div>
  )
}
