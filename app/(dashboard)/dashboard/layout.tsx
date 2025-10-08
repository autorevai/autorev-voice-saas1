import { ReactNode } from 'react'
import TrialBanner from '../components/TrialBanner'
import UsageDashboard from '../components/UsageDashboard'

export default function DashboardPageLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <>
      {/* Trial Banner and Usage Dashboard */}
      <div className="bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <TrialBanner />

          {/* Usage Dashboard */}
          <div className="mb-6">
            <UsageDashboard />
          </div>
        </div>
      </div>

      {/* Original Dashboard Content (has its own wrapper) */}
      {children}
    </>
  )
}
