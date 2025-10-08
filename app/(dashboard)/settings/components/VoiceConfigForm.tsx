// app/(dashboard)/settings/components/VoiceConfigForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Upload, Check, AlertCircle, Plus, Trash2, Mic, Sparkles } from 'lucide-react'
import { VoiceConfig, VOICE_IDS, VOICE_DESCRIPTIONS, STYLE_GUIDES } from '@/lib/voice-config/types'

export function VoiceConfigForm() {
  const [config, setConfig] = useState<VoiceConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState(0)
  const [hasPendingChanges, setHasPendingChanges] = useState(false)
  const [lastPublished, setLastPublished] = useState<string | null>(null)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current config
  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/voice-config')
      const data = await res.json()
      
      if (res.ok) {
        setConfig(data.config)
        setHasPendingChanges(data.hasPendingChanges)
        setLastPublished(data.lastPublished)
      } else {
        setError(data.error || 'Failed to load configuration')
      }
    } catch (err) {
      setError('Failed to load configuration')
      console.error('Load config error:', err)
    } finally {
      setLoading(false)
    }
  }

  const saveChanges = async () => {
    if (!config) return
    
    setSaving(true)
    setError(null)
    
    try {
      const res = await fetch('/api/voice-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setHasPendingChanges(true)
        setShowSuccess(true)
        setTimeout(() => setShowSuccess(false), 3000)
      } else {
        setError(data.error || 'Failed to save changes')
      }
    } catch (err) {
      setError('Failed to save changes')
      console.error('Save error:', err)
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    setPublishing(true)
    setPublishProgress(0)
    setError(null)
    
    // Simulate progress
    const interval = setInterval(() => {
      setPublishProgress(prev => Math.min(prev + 10, 90))
    }, 500)
    
    try {
      const res = await fetch('/api/voice-config/publish', {
        method: 'POST'
      })
      
      clearInterval(interval)
      const result = await res.json()
      
      if (result.success) {
        setPublishProgress(100)
        setHasPendingChanges(false)
        setLastPublished(new Date().toISOString())
        setShowSuccess(true)
        setTimeout(() => {
          setShowSuccess(false)
          setPublishProgress(0)
        }, 3000)
      } else {
        setError(result.error || 'Failed to publish changes')
        setPublishProgress(0)
      }
    } catch (err) {
      clearInterval(interval)
      setError('Failed to publish changes')
      setPublishProgress(0)
      console.error('Publish error:', err)
    } finally {
      setPublishing(false)
    }
  }

  const addKeyInfo = () => {
    if (!config) return
    setConfig({
      ...config,
      keyInfo: [...config.keyInfo, '']
    })
  }

  const removeKeyInfo = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      keyInfo: config.keyInfo.filter((_, i) => i !== index)
    })
  }

  const updateKeyInfo = (index: number, value: string) => {
    if (!config) return
    const newKeyInfo = [...config.keyInfo]
    newKeyInfo[index] = value
    setConfig({ ...config, keyInfo: newKeyInfo })
  }

  const addService = () => {
    if (!config) return
    setConfig({
      ...config,
      services: [...config.services, { name: '', priceRange: '' }]
    })
  }

  const removeService = (index: number) => {
    if (!config) return
    setConfig({
      ...config,
      services: config.services.filter((_, i) => i !== index)
    })
  }

  const updateService = (index: number, field: 'name' | 'priceRange', value: string) => {
    if (!config) return
    const newServices = [...config.services]
    newServices[index] = { ...newServices[index], [field]: value }
    setConfig({ ...config, services: newServices })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Failed to load configuration</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pending Changes Alert */}
      {hasPendingChanges && !publishing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Unpublished Changes</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Your changes are saved but not live yet. Click "Publish Changes" to update your AI receptionist.
                  </p>
                </div>
              </div>
              <Button 
                onClick={publish}
                disabled={publishing}
                className="ml-4 bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="w-4 h-4 mr-2" />
                Publish Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Publishing Progress */}
      {publishing && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-blue-900">
                  Publishing to VAPI...
                </span>
                <span className="text-sm text-blue-700">{publishProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${publishProgress}%` }}
                />
              </div>
              <p className="text-xs text-blue-600">
                This may take 30-60 seconds. Your AI will be updated shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {showSuccess && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Check className="w-5 h-5 text-green-600" />
              <p className="text-green-900 font-medium">
                {publishing ? 'Published successfully!' : 'Changes saved'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-900">{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mic className="w-5 h-5 text-gray-600" />
            <CardTitle>Voice & Personality</CardTitle>
          </div>
          <CardDescription>
            Choose how your AI receptionist sounds and behaves
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voice Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Voice
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(VOICE_IDS) as Array<keyof typeof VOICE_IDS>).map((voiceId) => (
                <button
                  key={voiceId}
                  type="button"
                  onClick={() => setConfig({ ...config, voice: voiceId })}
                  className={`p-4 border-2 rounded-lg text-left transition-all ${
                    config.voice === voiceId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium capitalize">{voiceId}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {VOICE_DESCRIPTIONS[voiceId]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Style Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Communication Style
            </label>
            <div className="space-y-3">
              {(Object.keys(STYLE_GUIDES) as Array<keyof typeof STYLE_GUIDES>).map((styleKey) => {
                const style = STYLE_GUIDES[styleKey]
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => setConfig({ ...config, style: styleKey })}
                    className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                      config.style === styleKey
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{style.label}</div>
                    <div className="text-sm text-gray-600 mt-1">{style.description}</div>
                    <div className="text-xs text-gray-500 mt-2 italic">{style.example}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Interruptions */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="font-medium">Allow Interruptions</div>
              <div className="text-sm text-gray-600">Let customers interrupt naturally during conversation</div>
            </div>
            <button
              type="button"
              onClick={() => setConfig({ ...config, allowInterruptions: !config.allowInterruptions })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.allowInterruptions ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.allowInterruptions ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Greeting Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Opening Greeting</CardTitle>
          <CardDescription>
            How your AI answers the phone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {(['default', 'emergency', 'custom'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setConfig({ 
                  ...config, 
                  greetingType: type,
                  customGreeting: type === 'custom' ? config.customGreeting || '' : undefined
                })}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  config.greetingType === type
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium capitalize">{type} Greeting</div>
              </button>
            ))}
          </div>

          {config.greetingType === 'custom' && (
            <textarea
              value={config.customGreeting || ''}
              onChange={(e) => setConfig({ ...config, customGreeting: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Enter your custom greeting..."
            />
          )}
        </CardContent>
      </Card>

      {/* Transfer Rules */}
      <Card>
        <CardHeader>
          <CardTitle>Call Handling Rules</CardTitle>
          <CardDescription>
            When should the AI transfer to a human?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            onAngry: 'Transfer frustrated or angry customers',
            onComplex: 'Transfer complex technical questions',
            onRequest: 'Transfer when explicitly requested'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <span className="text-sm font-medium">{label}</span>
              <button
                type="button"
                onClick={() => setConfig({
                  ...config,
                  transferTriggers: {
                    ...config.transferTriggers,
                    [key]: !config.transferTriggers[key as keyof typeof config.transferTriggers]
                  }
                })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  config.transferTriggers[key as keyof typeof config.transferTriggers]
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    config.transferTriggers[key as keyof typeof config.transferTriggers]
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Business Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Key Business Information</CardTitle>
              <CardDescription>
                Important facts your AI should know
              </CardDescription>
            </div>
            <Button type="button" onClick={addKeyInfo} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {config.keyInfo.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No key information added yet. Add facts like "Licensed & insured" or "24/7 emergency service"
            </p>
          ) : (
            config.keyInfo.map((info, index) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={info}
                  onChange={(e) => updateKeyInfo(index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Licensed & insured"
                />
                <Button
                  type="button"
                  onClick={() => removeKeyInfo(index)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Services Offered</CardTitle>
              <CardDescription>
                Services your AI can discuss and book
              </CardDescription>
            </div>
            <Button type="button" onClick={addService} size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Add Service
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {config.services.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No services added yet. Add services like "HVAC Maintenance" or "Emergency Repair"
            </p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Range
                    </th>
                    <th className="px-4 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {config.services.map((service, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={service.name}
                          onChange={(e) => updateService(index, 'name', e.target.value)}
                          className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 rounded"
                          placeholder="e.g., AC Repair"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={service.priceRange || ''}
                          onChange={(e) => updateService(index, 'priceRange', e.target.value)}
                          className="w-full px-2 py-1 border-0 focus:ring-2 focus:ring-blue-500 rounded"
                          placeholder="e.g., $150-$500"
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          onClick={() => removeService(index)}
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-600" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          variant="outline"
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
        
        {hasPendingChanges && (
          <Button
            type="button"
            onClick={publish}
            disabled={publishing}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {publishing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Publish to VAPI
              </>
            )}
          </Button>
        )}
      </div>

      {/* Last Published */}
      {lastPublished && !hasPendingChanges && (
        <p className="text-sm text-gray-500 text-center">
          Last published: {new Date(lastPublished).toLocaleString()}
        </p>
      )}
    </div>
  )
}
