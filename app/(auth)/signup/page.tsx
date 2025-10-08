'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Phone, Clock, TrendingUp, CheckCircle, Zap, Shield } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const supabase = createClient()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Redirect to onboarding to create tenant
      router.push('/onboarding')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Zap className="w-4 h-4" />
            Start Your 14-Day Free Trial
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Never Miss Another Lead
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Stop losing revenue to missed calls. Your AI receptionist answers every call, books appointments, and follows up automatically.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left Column - Benefits */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Increase Revenue</h3>
                  <p className="text-sm text-gray-600">
                    Capture every lead, 24/7. Businesses see 30-40% more bookings when they answer every call.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Phone className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Stop Missing Calls</h3>
                  <p className="text-sm text-gray-600">
                    Your AI receptionist handles unlimited calls simultaneously. No more busy signals or voicemails.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-start gap-4">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Clock className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Save Hours Daily</h3>
                  <p className="text-sm text-gray-600">
                    Automate appointment booking, reminders, and follow-ups. Focus on serving customers, not answering phones.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border-2 border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 font-semibold mb-3">
                <Zap className="w-5 h-5" />
                Limited Time Offer
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <strong className="text-orange-700">10 free calls or 25 minutes</strong> included in your trial
              </p>
              <p className="text-xs text-gray-600">
                No credit card required • Cancel anytime
              </p>
            </div>
          </div>

          {/* Center Column - Signup Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Create your account</h2>
                <p className="text-gray-600">Get started in less than 2 minutes</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Work Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="••••••••"
                    minLength={8}
                    required
                  />
                  <p className="mt-1 text-xs text-gray-500">Minimum 8 characters</p>
                </div>

                <div className="flex items-start">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                    I agree to the{' '}
                    <a href="/terms" target="_blank" className="text-blue-600 hover:underline">
                      Terms of Service
                    </a>
                    {' '}and{' '}
                    <a href="/privacy" target="_blank" className="text-blue-600 hover:underline">
                      Privacy Policy
                    </a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading || !agreedToTerms}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-6 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-blue-500/30 transition-all"
                >
                  {loading ? 'Creating account...' : 'Start Free Trial →'}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Trust & Features */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-blue-600" />
                What You Get
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">24/7 AI receptionist that sounds human</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Automatic appointment booking & calendar sync</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">SMS confirmations & reminders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Missed call follow-up (automatic)</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Real-time dashboard & analytics</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700">Custom greetings & call scripts</span>
                </li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-900 mb-1">$0</div>
                <div className="text-sm text-blue-700 mb-4">for 14 days</div>
                <div className="text-xs text-blue-600 space-y-1">
                  <p>✓ No credit card required</p>
                  <p>✓ Full feature access</p>
                  <p>✓ Cancel anytime</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">After trial, plans from:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Starter</span>
                  <span className="font-semibold text-gray-900">$299/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Growth</span>
                  <span className="font-semibold text-gray-900">$699/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>Pro</span>
                  <span className="font-semibold text-gray-900">$1,499/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="mt-12 text-center">
          <p className="text-sm text-gray-500">
            Join hundreds of businesses automating their phone calls
          </p>
        </div>
      </div>
    </div>
  )
}
