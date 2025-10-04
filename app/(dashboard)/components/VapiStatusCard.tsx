'use client'

import { Phone, CheckCircle, Clock, Activity } from 'lucide-react'

interface VapiStatusCardProps {
  phoneNumber?: string
  isActive: boolean
  callsToday: number
  lastCall?: string
}

export default function VapiStatusCard({ 
  phoneNumber, 
  isActive, 
  callsToday, 
  lastCall 
}: VapiStatusCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">AI Agent Status</h3>
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
          isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isActive ? 'bg-green-500' : 'bg-red-500'
          }`} />
          {isActive ? 'Active' : 'Inactive'}
        </div>
      </div>

      {phoneNumber && (
        <div className="mb-4">
          <div className="flex items-center space-x-2 text-sm text-gray-600 mb-1">
            <Phone className="w-4 h-4" />
            <span>Customer Phone Number</span>
          </div>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {phoneNumber}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Give this number to your customers to call
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Calls Today</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">{callsToday}</div>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 text-gray-600 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Last Call</span>
          </div>
          <div className="text-sm font-medium text-gray-900">
            {lastCall ? new Date(lastCall).toLocaleTimeString() : 'None'}
          </div>
        </div>
      </div>
    </div>
  )
}
