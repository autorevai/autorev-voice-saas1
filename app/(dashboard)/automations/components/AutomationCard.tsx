'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { TrendingUp, ChevronDown, ChevronUp, AlertCircle, PhoneCall, Moon, CreditCard, Star } from 'lucide-react'
import Link from 'next/link'

interface AutomationCardProps {
  automation: {
    id: string
    title: string
    description: string
    longDescription?: string
    howItWorks?: string[]
    iconName: string
    color: string
    enabled: boolean
    stats: { label: string; value: string | number }[]
    impact: string
    badge: string
    locked?: boolean
    canToggle?: boolean
  }
  colorClass: string
}

const iconMap = {
  PhoneCall,
  Moon,
  CreditCard,
  Star
}

export function AutomationCard({ automation, colorClass }: AutomationCardProps) {
  const [enabled, setEnabled] = useState(automation.enabled)
  const [toggling, setToggling] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const Icon = iconMap[automation.iconName as keyof typeof iconMap]

  async function handleToggle() {
    if (automation.locked || !automation.canToggle) return

    setToggling(true)
    setError(null)

    try {
      const res = await fetch('/api/automations/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          automationId: automation.id,
          enabled: !enabled
        })
      })

      if (!res.ok) {
        throw new Error('Failed to toggle automation')
      }

      setEnabled(!enabled)
    } catch (err) {
      setError('Failed to update automation. Please try again.')
      console.error('Toggle error:', err)
    } finally {
      setToggling(false)
    }
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
      {automation.locked && (
        <div className="absolute inset-0 bg-gray-50/50 backdrop-blur-[2px] z-10 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Icon className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Coming Soon</h4>
            <p className="text-sm text-gray-600">This automation will be available soon!</p>
          </div>
        </div>
      )}

      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-lg ${colorClass} border`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex items-center space-x-3">
            <Badge
              className={
                enabled
                  ? 'bg-green-100 text-green-800 border-green-200'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }
            >
              {automation.badge}
            </Badge>
            {automation.canToggle && !automation.locked && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">
                  {enabled ? 'Enabled' : 'Disabled'}
                </span>
                <Switch
                  checked={enabled}
                  onCheckedChange={handleToggle}
                  disabled={toggling}
                />
              </div>
            )}
          </div>
        </div>

        <CardTitle className="text-xl">{automation.title}</CardTitle>
        <CardDescription className="text-sm mt-2">{automation.description}</CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Expandable Details */}
        {(automation.longDescription || automation.howItWorks) && (
          <div className="mb-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              {showDetails ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  <span>Hide Details</span>
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  <span>How It Works</span>
                </>
              )}
            </button>

            {showDetails && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                {automation.longDescription && (
                  <p className="text-sm text-gray-700 mb-4">{automation.longDescription}</p>
                )}
                {automation.howItWorks && (
                  <div>
                    <h5 className="text-sm font-semibold text-gray-900 mb-2">Process:</h5>
                    <ul className="space-y-2">
                      {automation.howItWorks.map((step, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700">
                          <span className="text-blue-600 font-medium">{idx + 1}.</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {automation.stats.map((stat, idx) => (
            <div key={idx} className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Impact Badge */}
        <div className="flex items-center space-x-2 mb-4">
          <TrendingUp className="w-4 h-4 text-green-600" />
          <span className="text-sm font-medium text-green-600">{automation.impact}</span>
        </div>

        {/* Action Buttons */}
        {enabled && !automation.locked && (
          <div className="flex space-x-3">
            <Link
              href="/calls"
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors text-center"
            >
              View Recovered Calls
            </Link>
            <Link
              href="/dashboard"
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Activity Feed
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
