import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PhoneCall, MessageSquare, Clock, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface ActivityItem {
  id: string
  type: 'smart_call_recovery' | 'after_hours' | 'text_to_pay' | 'review'
  title: string
  description: string
  time: string
  impact?: string
  isUrgent?: boolean
}

interface AutomationActivityFeedProps {
  activities: ActivityItem[]
  totalRecoveries: number
  successRate: number
}

export default function AutomationActivityFeed({
  activities,
  totalRecoveries,
  successRate
}: AutomationActivityFeedProps) {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'smart_call_recovery':
        return <PhoneCall className="w-5 h-5 text-blue-600" />
      default:
        return <MessageSquare className="w-5 h-5 text-blue-600" />
    }
  }

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'smart_call_recovery':
        return 'blue'
      default:
        return 'gray'
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Automation Activity</CardTitle>
            <CardDescription>AI-powered follow-ups and recovery</CardDescription>
          </div>
          <Link
            href="/automations"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View All →
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
          <div>
            <p className="text-xs text-gray-600 mb-1">Smart Recovery</p>
            <p className="text-2xl font-bold text-blue-600">{totalRecoveries}</p>
            <p className="text-xs text-gray-500">attempts today</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 mb-1">Success Rate</p>
            <div className="flex items-center space-x-2">
              <p className="text-2xl font-bold text-green-600">{successRate}%</p>
              {successRate > 0 && <TrendingUp className="w-4 h-4 text-green-600" />}
            </div>
            <p className="text-xs text-gray-500">converted to bookings</p>
          </div>
        </div>

        {/* Activity List */}
        <div className="space-y-3">
          {activities.length > 0 ? (
            activities.slice(0, 5).map((activity) => {
              const color = getActivityColor(activity.type)
              return (
                <div
                  key={activity.id}
                  className={`flex items-start space-x-3 p-3 bg-${color}-50 rounded-lg border border-${color}-100 hover:shadow-sm transition-shadow`}
                >
                  <div className={`p-2 bg-${color}-100 rounded-lg flex-shrink-0`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-gray-900 text-sm truncate">
                        {activity.title}
                      </h4>
                      <span className="text-xs text-gray-500 flex items-center flex-shrink-0 ml-2">
                        <Clock className="w-3 h-3 mr-1" />
                        {activity.time}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{activity.description}</p>
                    {activity.impact && (
                      <div className="mt-2">
                        <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                          {activity.impact}
                        </Badge>
                      </div>
                    )}
                    {activity.isUrgent && (
                      <div className="mt-2">
                        <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                          🚨 Urgent
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-sm">No automation activity yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Activity will appear here when calls are recovered
              </p>
            </div>
          )}
        </div>

        {activities.length > 5 && (
          <div className="mt-4 text-center">
            <Link
              href="/automations"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center"
            >
              View {activities.length - 5} more activities →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
