import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Clock, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { AutomationCard } from './components/AutomationCard'

interface AutomationStats {
  smartCallRecovery: {
    enabled: boolean
    attemptsToday: number
    successRate: number
    totalRescued: number
    smsSent: number
  }
  afterHours: {
    enabled: boolean
    bookingsToday: number
    revenue: number
  }
  textToPay: {
    enabled: boolean
    collected: number
  }
  reviewEngine: {
    enabled: boolean
    requestsSent: number
  }
}

async function getAutomationStats(): Promise<AutomationStats> {
  const db = await createClient()

  try {
    const { data: { user }, error: authError } = await db.auth.getUser()
    if (authError || !user) throw new Error('Authentication failed')

    const { data: userRecord } = await db
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (!userRecord?.tenant_id) throw new Error('No tenant found')
    const tenantId = userRecord.tenant_id

    // Get tenant settings
    const { data: tenant } = await db
      .from('tenants')
      .select('missed_call_rescue_enabled')
      .eq('id', tenantId)
      .single()

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get Smart Call Recovery stats
    const { data: recoveryAttempts, count: totalAttempts } = await db
      .from('missed_call_rescues')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte('created_at', todayISO)

    const smsSent = recoveryAttempts?.filter(r => r.sms_sent).length || 0
    const callbacksMade = recoveryAttempts?.filter(r => r.callback_made).length || 0
    const successRate = totalAttempts && totalAttempts > 0
      ? Math.round((callbacksMade / totalAttempts) * 100)
      : 0

    const { count: totalRescued } = await db
      .from('missed_call_rescues')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('outcome', 'booked')

    return {
      smartCallRecovery: {
        enabled: tenant?.missed_call_rescue_enabled !== false,
        attemptsToday: totalAttempts || 0,
        successRate,
        totalRescued: totalRescued || 0,
        smsSent
      },
      afterHours: {
        enabled: false,
        bookingsToday: 0,
        revenue: 0
      },
      textToPay: {
        enabled: false,
        collected: 0
      },
      reviewEngine: {
        enabled: false,
        requestsSent: 0
      }
    }
  } catch (error) {
    console.error('Failed to fetch automation stats:', error)
    return {
      smartCallRecovery: { enabled: true, attemptsToday: 0, successRate: 0, totalRescued: 0, smsSent: 0 },
      afterHours: { enabled: false, bookingsToday: 0, revenue: 0 },
      textToPay: { enabled: false, collected: 0 },
      reviewEngine: { enabled: false, requestsSent: 0 }
    }
  }
}

export default async function AutomationsPage() {
  const stats = await getAutomationStats()

  const automations = [
    {
      id: 'smart-call-recovery',
      title: 'Smart Call Recovery',
      description: 'Rescue missed calls with intelligent SMS follow-up and urgency detection',
      longDescription: 'Automatically detects missed calls and sends personalized SMS messages to recover potential bookings. Uses AI to analyze call transcripts for urgency signals and adapts the follow-up strategy accordingly.',
      howItWorks: [
        'Detects when calls are missed or abandoned',
        'Analyzes transcript for urgency keywords (emergency, urgent, broken, etc.)',
        'Sends personalized SMS with detected issue details',
        'Urgent calls get immediate callback (30s), normal calls get 5-minute callback',
        'Tracks recovery success rate and ROI'
      ],
      iconName: 'PhoneCall',
      color: 'blue',
      enabled: stats.smartCallRecovery.enabled,
      stats: [
        { label: 'Attempts Today', value: stats.smartCallRecovery.attemptsToday },
        { label: 'SMS Sent', value: stats.smartCallRecovery.smsSent },
        { label: 'Success Rate', value: `${stats.smartCallRecovery.successRate}%` },
        { label: 'Total Rescued', value: stats.smartCallRecovery.totalRescued }
      ],
      impact: '40-60% recovery rate',
      badge: 'Active',
      canToggle: true
    },
    {
      id: 'after-hours',
      title: '24/7 Smart Scheduling',
      description: 'Book emergency appointments after hours at premium rates',
      longDescription: 'Automatically handles after-hours and weekend calls, offering premium emergency slots at higher rates. Integrates with your calendar to ensure proper coverage and maximizes revenue from urgent situations.',
      howItWorks: [
        'Detects calls outside normal business hours',
        'Offers premium emergency appointment slots',
        'Applies configurable after-hours pricing multiplier (1.5x-2.5x)',
        'Syncs with Google Calendar for availability',
        'Sends emergency booking confirmations with premium pricing details'
      ],
      iconName: 'Moon',
      color: 'purple',
      enabled: stats.afterHours.enabled,
      stats: [
        { label: 'After-Hours Bookings', value: stats.afterHours.bookingsToday },
        { label: 'Extra Revenue', value: `$${stats.afterHours.revenue}` }
      ],
      impact: '+15% revenue lift',
      badge: 'Coming Soon',
      locked: true,
      canToggle: false
    },
    {
      id: 'text-to-pay',
      title: 'Text-to-Pay Deposits',
      description: 'Secure bookings with automated deposit collection via SMS',
      longDescription: 'Reduces no-shows by automatically collecting deposits via SMS payment links. Sends secure Stripe payment links immediately after booking, with friendly reminders if not paid within the configured timeframe.',
      howItWorks: [
        'Automatically sends SMS payment link after booking creation',
        'Integrates with Stripe for secure payment processing',
        'Sends friendly reminder if deposit not paid within 2 hours',
        'Configurable deposit amount (fixed or percentage)',
        'Automatically cancels unpaid bookings after 24 hours',
        'Sends payment receipts and confirmation'
      ],
      iconName: 'CreditCard',
      color: 'green',
      enabled: stats.textToPay.enabled,
      stats: [
        { label: 'Deposits Collected', value: `$${stats.textToPay.collected}` }
      ],
      impact: '25% reduction in no-shows',
      badge: 'Coming Soon',
      locked: true,
      canToggle: false
    },
    {
      id: 'review-engine',
      title: 'Review Engine',
      description: 'Automated review requests to happy customers',
      longDescription: 'Automatically identifies satisfied customers and sends personalized review requests at the optimal time. Uses sentiment analysis on call transcripts to only request reviews from positive interactions.',
      howItWorks: [
        'Analyzes call sentiment to identify happy customers',
        'Waits 24-48 hours after service completion',
        'Sends personalized SMS with direct review link',
        'Routes to Google, Yelp, or custom review platforms',
        'Sends gentle reminder if no review after 3 days',
        'Tracks review generation rate and response times'
      ],
      iconName: 'Star',
      color: 'amber',
      enabled: stats.reviewEngine.enabled,
      stats: [
        { label: 'Reviews Requested', value: stats.reviewEngine.requestsSent }
      ],
      impact: '3-5x more reviews',
      badge: 'Coming Soon',
      locked: true,
      canToggle: false
    }
  ]

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    amber: 'bg-amber-100 text-amber-600 border-amber-200'
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Automations</h1>
              <p className="text-gray-600">AI-powered automations to increase bookings and revenue</p>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700">
                {automations.filter(a => a.enabled).length} Active
              </span>
            </div>
          </div>
        </div>

        {/* Automation Cards Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {automations.map((automation) => {
            const colorClass = colorClasses[automation.color as keyof typeof colorClasses]

            return (
              <AutomationCard
                key={automation.id}
                automation={automation}
                colorClass={colorClass}
              />
            )
          })}
        </div>

        {/* Recent Activity Section */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Automation Activity</CardTitle>
                  <CardDescription>Latest automation triggers and results</CardDescription>
                </div>
                <Link href="/automations/activity" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  View All →
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats.smartCallRecovery.attemptsToday > 0 ? (
                  <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <MessageSquare className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900">Smart Call Recovery Active</h4>
                        <span className="text-xs text-gray-500 flex items-center">
                          <Clock className="w-3 h-3 mr-1" />
                          Today
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Sent {stats.smartCallRecovery.smsSent} SMS message{stats.smartCallRecovery.smsSent !== 1 ? 's' : ''} to recover missed calls
                      </p>
                      {stats.smartCallRecovery.successRate > 0 && (
                        <div className="mt-2">
                          <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                            {stats.smartCallRecovery.successRate}% Success Rate
                          </Badge>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Zap className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm">No automation activity yet today</p>
                    <p className="text-xs text-gray-400 mt-1">Activity will appear here when automations trigger</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
