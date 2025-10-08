// app/(dashboard)/settings/components/BusinessProfileForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Check, AlertCircle, Building2 } from 'lucide-react'

export function BusinessProfileForm() {
  const [businessName, setBusinessName] = useState('')
  const [website, setWebsite] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalData, setOriginalData] = useState({ businessName: '', website: '' })

  // Load current profile
  useEffect(() => {
    loadProfile()
  }, [])

  // Track changes
  useEffect(() => {
    const changed =
      businessName !== originalData.businessName ||
      website !== originalData.website
    setHasChanges(changed)
  }, [businessName, website, originalData])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/settings/business-profile')
      const data = await res.json()

      if (res.ok) {
        setBusinessName(data.businessName || '')
        setWebsite(data.website || '')
        setOriginalData({
          businessName: data.businessName || '',
          website: data.website || ''
        })
      } else {
        setError(data.error || 'Failed to load profile')
      }
    } catch (err) {
      setError('Failed to load profile')
      console.error('Load profile error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveProfile = async () => {
    if (!businessName.trim()) {
      setError('Business name is required')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/settings/business-profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          website: website.trim()
        })
      })

      const data = await res.json()

      if (res.ok) {
        setOriginalData({
          businessName: businessName.trim(),
          website: website.trim()
        })
        setHasChanges(false)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        setError(data.error || 'Failed to save profile')
      }
    } catch (err) {
      setError('Failed to save profile')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const resetChanges = () => {
    setBusinessName(originalData.businessName)
    setWebsite(originalData.website)
    setHasChanges(false)
    setError(null)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Building2 className="w-5 h-5 text-gray-600" />
          <CardTitle>Business Profile</CardTitle>
        </div>
        <CardDescription>
          Update your business name and website information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Success Message */}
        {showSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-900 font-medium">Profile updated successfully</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-900">{error}</p>
            </div>
          </div>
        )}

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Anderson's Heating & Cooling"
          />
          <p className="mt-1 text-xs text-gray-500">
            This is how your business will appear in the dashboard
          </p>
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Website
          </label>
          <input
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., yourbusiness.com"
          />
          <p className="mt-1 text-xs text-gray-500">
            Optional: Your business website URL
          </p>
        </div>

        {/* Action Buttons */}
        {hasChanges && (
          <div className="flex justify-end space-x-3 pt-2">
            <Button
              type="button"
              onClick={resetChanges}
              variant="outline"
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={saveProfile}
              disabled={saving || !businessName.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
