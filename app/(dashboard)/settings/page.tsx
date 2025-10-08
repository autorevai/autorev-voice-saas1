// app/(dashboard)/settings/page.tsx

import { VoiceConfigForm } from './components/VoiceConfigForm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings, Mic, Phone, Bell } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="w-8 h-8 text-gray-600" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>
        <p className="text-gray-600">
          Manage your AI receptionist configuration and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          <button className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600">
            <div className="flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span>Voice Configuration</span>
            </div>
          </button>
          <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <span>Phone Numbers</span>
            </div>
          </button>
          <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
            </div>
          </button>
        </nav>
      </div>

      {/* Voice Configuration Form */}
      <VoiceConfigForm />

      {/* Help Card */}
      <Card className="mt-8 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">How Voice Configuration Works</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>
            <strong>1. Make changes:</strong> Update your voice settings, greetings, and business information.
          </p>
          <p>
            <strong>2. Save:</strong> Click &quot;Save Changes&quot; to store your configuration (not live yet).
          </p>
          <p>
            <strong>3. Publish:</strong> Click &quot;Publish Changes&quot; to update your live AI receptionist (~30-60 seconds).
          </p>
          <p className="pt-2 text-xs">
            💡 Tip: You can make multiple changes before publishing. Only published changes affect your live AI.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
