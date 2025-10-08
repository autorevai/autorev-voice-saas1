import Link from 'next/link'
import UserMenu from './components/UserMenu'
import { TenantProvider } from '@/lib/tenant-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <TenantProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Top Navigation */}
        <nav className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link href="/dashboard" className="flex-shrink-0">
                  <h1 className="text-xl font-bold text-gray-900">
                    AutoRev Dashboard
                  </h1>
                </Link>
              </div>
              
              <div className="flex items-center space-x-8">
                <Link
                  href="/dashboard"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/calls"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Calls
                </Link>
                <Link
                  href="/bookings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Bookings
                </Link>
                <Link
                  href="/automations"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Automations
                </Link>
                <Link
                  href="/settings"
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Settings
                </Link>

                {/* User Menu */}
                <UserMenu />
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main>
          {children}
        </main>
      </div>
    </TenantProvider>
  )
}
