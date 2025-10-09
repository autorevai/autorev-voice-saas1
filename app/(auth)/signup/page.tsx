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
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-12">
        {/* Compact Header - Mobile Optimized */}
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium mb-3 md:mb-4">
            <Zap className="w-3 h-3 md:w-4 md:h-4" />
            Start Your 14-Day Free Trial
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-2 md:mb-4">
            Never Miss Another Lead
          </h1>
          <p className="text-sm md:text-xl text-gray-600 max-w-2xl mx-auto px-4">
            Stop losing revenue to missed calls. Your AI receptionist answers every call, books appointments, and follows up automatically.
          </p>
        </div>

        {/* Mobile: Form First, then Benefits | Desktop: 3 columns */}
        <div className="lg:hidden">
          {/* MOBILE: Signup Form FIRST (above the fold) */}
          <div className="mb-6">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-200">
              <div className="mb-4 text-center">
                <h2 className="text-xl font-bold text-gray-900 mb-1">Create your account</h2>
                <p className="text-sm text-gray-600">Get started in less than 2 minutes</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <form onSubmit={handleSignup} className="space-y-3">
                <div>
                  <label htmlFor="fullName-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Your Name
                  </label>
                  <input
                    id="fullName-mobile"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="email-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Work Email
                  </label>
                  <input
                    id="email-mobile"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password-mobile" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                  </label>
                  <input
                    id="password-mobile"
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
                    id="terms-mobile"
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    required
                  />
                  <label htmlFor="terms-mobile" className="ml-2 text-xs text-gray-600">
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

              {/* Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={() => {
                  window.location.href = '/api/auth/google/signup'
                }}
                type="button"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="mt-4 text-center text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-blue-600 hover:underline font-medium">
                  Sign in
                </Link>
              </div>
            </div>
          </div>

          {/* MOBILE: Benefits AFTER form */}
          <div className="space-y-4 mb-6">
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-4 border-2 border-orange-200">
              <div className="flex items-center gap-2 text-orange-700 font-semibold mb-2 text-sm">
                <Zap className="w-4 h-4" />
                Limited Time Offer
              </div>
              <p className="text-sm text-gray-700 mb-1">
                <strong className="text-orange-700">10 free calls or 25 minutes</strong> included in your trial
              </p>
              <p className="text-xs text-gray-600">
                No credit card required • Cancel anytime
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-blue-600" />
                What You Get
              </h3>
              <ul className="space-y-2">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">24/7 AI receptionist that sounds human</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">Automatic appointment booking & calendar sync</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">SMS confirmations & reminders</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-700">Missed call follow-up (automatic)</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* DESKTOP: Original 3-column layout */}
        <div className="hidden lg:grid lg:grid-cols-3 gap-8 items-start">
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

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={() => {
                  window.location.href = '/api/auth/google/signup'
                }}
                type="button"
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </button>

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
