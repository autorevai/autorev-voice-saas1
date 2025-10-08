// app/(dashboard)/settings/page.tsx

import { BusinessProfileForm } from './components/BusinessProfileForm'
import { VoiceConfigForm } from './components/VoiceConfigForm'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Settings } from 'lucide-react'

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
          Manage your business profile and AI receptionist configuration
        </p>
      </div>

      {/* Business Profile Form */}
      <div className="mb-8">
        <BusinessProfileForm />
      </div>

      {/* Voice Configuration Section Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Voice Configuration</h2>
        <p className="text-sm text-gray-600">
          Customize how your AI receptionist sounds and behaves
        </p>
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
