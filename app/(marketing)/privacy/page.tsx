import { readFile } from 'fs/promises'
import { join } from 'path'

export const metadata = {
  title: 'Privacy Policy | AutoRev',
  description: 'Privacy Policy for AutoRev AI voice receptionist platform'
}

async function getPrivacyContent() {
  try {
    const filePath = join(process.cwd(), 'public', 'privacy-content.html')
    const content = await readFile(filePath, 'utf-8')
    return content
  } catch (error) {
    console.error('Error reading privacy content:', error)
    return null
  }
}

export default async function PrivacyPage() {
  const privacyHtml = await getPrivacyContent()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          {/* Header */}
          <div className="mb-8 pb-8 border-b">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-600">Last updated: October 7, 2025</p>
          </div>

          {/* Full Privacy Content */}
          {privacyHtml ? (
            <div
              className="privacy-content"
              dangerouslySetInnerHTML={{ __html: privacyHtml }}
            />
          ) : (
            <div className="text-center py-12">
              <p className="text-red-600">Error loading privacy policy content. Please contact support.</p>
            </div>
          )}

          {/* Back to Dashboard Link */}
          <div className="mt-12 pt-8 border-t text-center">
            <a
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
