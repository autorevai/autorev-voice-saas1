'use client'

interface PhoneNumberCardProps {
  phoneNumber: string
}

export default function PhoneNumberCard({ phoneNumber }: PhoneNumberCardProps) {
  const handleCopyNumber = () => {
    navigator.clipboard.writeText(phoneNumber)
  }

  return (
    <div className="mb-8">
      <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              Setup Complete! 🎉
            </h3>
            <p className="text-green-700 mb-4">
              Your AI receptionist is live and ready to take calls.
            </p>
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold text-green-800">
                {phoneNumber}
              </div>
              <button
                onClick={handleCopyNumber}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
              >
                Copy Number
              </button>
              <a
                href={`tel:${phoneNumber}`}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Test Call
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
