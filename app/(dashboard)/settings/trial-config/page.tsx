// app/(dashboard)/settings/trial-config/page.tsx
// Admin page to view/change trial configuration

'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TRIAL_VARIANTS, AB_TEST_CONFIG } from '@/lib/trial/config'
import { Badge } from '@/components/ui/badge'

export default function TrialConfigPage() {
  return (
    <div className="max-w-6xl mx-auto p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Trial Configuration
        </h1>
        <p className="text-gray-600">
          View and manage trial variants and A/B test settings
        </p>
      </div>

      {/* A/B Test Status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>A/B Testing Status</CardTitle>
          <CardDescription>
            Current configuration for trial experiments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">A/B Testing:</span>
              <Badge variant={AB_TEST_CONFIG.enabled ? 'default' : 'secondary'}>
                {AB_TEST_CONFIG.enabled ? 'ENABLED' : 'DISABLED'}
              </Badge>
            </div>
            
            {!AB_TEST_CONFIG.enabled && (
              <div className="flex items-center justify-between">
                <span className="font-medium">Default Variant:</span>
                <Badge variant="outline">
                  {AB_TEST_CONFIG.defaultVariant}
                </Badge>
              </div>
            )}

            {AB_TEST_CONFIG.enabled && (
              <div>
                <h4 className="font-medium mb-3">Traffic Distribution:</h4>
                <div className="space-y-2">
                  {Object.entries(AB_TEST_CONFIG.distribution).map(([variant, percent]) => (
                    <div key={variant} className="flex items-center justify-between">
                      <span className="text-sm">{variant}</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">To Change Configuration:</h4>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Edit <code className="bg-blue-100 px-1 rounded">lib/trial/config.ts</code></li>
              <li>2. Update <code className="bg-blue-100 px-1 rounded">AB_TEST_CONFIG</code></li>
              <li>3. Deploy changes</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {/* All Variants */}
      <div className="grid md:grid-cols-2 gap-6">
        {Object.entries(TRIAL_VARIANTS).map(([key, variant]) => {
          const isActive = AB_TEST_CONFIG.enabled 
            ? AB_TEST_CONFIG.distribution[key as keyof typeof AB_TEST_CONFIG.distribution] > 0
            : key === AB_TEST_CONFIG.defaultVariant

          return (
            <Card key={key} className={isActive ? 'border-blue-300' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{variant.name}</CardTitle>
                    <CardDescription className="text-sm mt-1">
                      {variant.description}
                    </CardDescription>
                  </div>
                  {isActive && (
                    <Badge className="bg-green-600">Active</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calls Limit:</span>
                    <span className="font-medium">{variant.limits.calls}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Minutes Limit:</span>
                    <span className="font-medium">{variant.limits.minutes}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">{variant.durationDays} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Behavior:</span>
                    <Badge variant={variant.behavior === 'hard' ? 'default' : 'outline'}>
                      {variant.behavior}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Allow Wait:</span>
                    <span className={variant.allowWaitForAutoConvert ? 'text-green-600' : 'text-red-600'}>
                      {variant.allowWaitForAutoConvert ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Quick Edit Instructions */}
      <Card className="mt-8 border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-900">Quick Configuration Examples</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-purple-900 space-y-4">
          <div>
            <h4 className="font-semibold mb-2">To Make All Trials 20 Calls / 50 Minutes:</h4>
            <pre className="bg-purple-100 p-3 rounded text-xs overflow-x-auto">
{`// In lib/trial/config.ts
export const AB_TEST_CONFIG = {
  enabled: false,
  defaultVariant: 'generous'  // Uses 20/50 limits
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">To A/B Test Two Variants:</h4>
            <pre className="bg-purple-100 p-3 rounded text-xs overflow-x-auto">
{`export const AB_TEST_CONFIG = {
  enabled: true,
  distribution: {
    control: 50,    // 50% get 10 calls/25 min
    generous: 50,   // 50% get 20 calls/50 min
  }
}`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">To Test 3 Variants:</h4>
            <pre className="bg-purple-100 p-3 rounded text-xs overflow-x-auto">
{`export const AB_TEST_CONFIG = {
  enabled: true,
  distribution: {
    control: 34,
    generous: 33,
    short: 33    // 7-day trial instead of 14
  }
}`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
