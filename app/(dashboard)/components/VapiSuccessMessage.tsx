'use client'

import { CheckCircle, Phone, Copy, ExternalLink } from 'lucide-react'
import { useState } from 'react'

interface VapiSuccessMessageProps {
  phoneNumber: string
  assistantId: string
}

export default function VapiSuccessMessage({ phoneNumber, assistantId }: VapiSuccessMessageProps) {
  const [copied, setCopied] = useState(false)

  const copyPhoneNumber = async () => {
    try {
      await navigator.clipboard.writeText(phoneNumber)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6 mb-6">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-green-900 mb-2">
            🎉 Your AI Agent is Live!
          </h3>
          
          <p className="text-green-800 mb-4">
            Your voice assistant is now active and ready to take calls. 
            Share the phone number below with your customers.
          </p>

          <div className="bg-white rounded-lg p-4 border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
                  <Phone className="w-4 h-4" />
                  <span>Customer Phone Number</span>
                </div>
                <div className="text-2xl font-mono font-bold text-blue-600">
                  {phoneNumber}
                </div>
              </div>
              
              <button
                onClick={copyPhoneNumber}
                className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href={`tel:${phoneNumber}`}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
            >
              <Phone className="w-4 h-4" />
              <span>Test Call</span>
            </a>
            
            <button
              onClick={() => window.open('https://dashboard.vapi.ai', '_blank')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              <span>VAPI Dashboard</span>
            </button>
          </div>

          <div className="mt-4 text-sm text-green-700">
            <p className="font-medium">Next Steps:</p>
            <ul className="list-disc list-inside space-y-1 mt-1">
              <li>Add this number to your website and business cards</li>
              <li>Monitor calls in real-time on this dashboard</li>
              <li>Check the "Bookings" tab to see scheduled appointments</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
