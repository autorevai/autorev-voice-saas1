// app/(marketing)/book-demo/page.tsx
// Book a demo page with Calendly embed and conversion tracking

import Link from 'next/link'
import { ArrowLeft, Phone, Calendar } from 'lucide-react'
import Script from 'next/script'

export const metadata = {
  title: 'Book a Demo - AutoRev',
  description: 'Schedule a personalized demo of AutoRev AI phone receptionist',
}

export default function BookDemoPage() {
  return (
    <>
      {/* Calendly embed script */}
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />

      {/* Meta Pixel Conversion Tracking */}
      <Script id="meta-conversion-tracking" strategy="afterInteractive">
        {`
          // Track when user views the booking page
          if (typeof fbq !== 'undefined') {
            fbq('track', 'ViewContent', {
              content_name: 'Book Demo Page',
              content_category: 'Demo Booking'
            });
          }

          // Track when user successfully books a meeting
          window.addEventListener('message', function(e) {
            if (e.data.event && e.data.event.indexOf('calendly') === 0) {
              if (e.data.event === 'calendly.event_scheduled') {
                // Fire Meta Pixel conversion event
                if (typeof fbq !== 'undefined') {
                  fbq('track', 'Schedule', {
                    content_name: 'Demo Booking',
                    value: 100.00,
                    currency: 'USD'
                  });
                }

                // Fire Google Analytics conversion event
                if (typeof gtag !== 'undefined') {
                  gtag('event', 'conversion', {
                    'send_to': 'G-LNZE91DX9L',
                    'event_category': 'Demo',
                    'event_label': 'Demo Booked',
                    'value': 100.00
                  });
                }

                console.log('Demo booking conversion tracked!');
              }
            }
          });
        `}
      </Script>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Navigation */}
        <nav className="border-b border-gray-200 bg-white/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <Link href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
                <Phone className="w-8 h-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">AutoRev</span>
              </Link>
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-600 hover:text-gray-900 text-sm font-medium"
                >
                  Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  Get Started Free
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Your Demo
            </div>

            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              See AutoRev in Action
            </h1>

            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Book a 30-minute personalized demo and discover how AutoRev can transform your phone system with AI.
            </p>
          </div>

          {/* Calendly Embed */}
          <div className="bg-white rounded-2xl shadow-xl p-4 md:p-8">
            <div
              className="calendly-inline-widget"
              data-url="https://calendly.com/chris-autorev/30min"
              style={{ minWidth: '320px', height: '700px' }}
            />
          </div>

          {/* Benefits Section */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl font-bold text-blue-600 mb-2">30 min</div>
              <p className="text-gray-600">Personalized walkthrough</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl font-bold text-purple-600 mb-2">Live Demo</div>
              <p className="text-gray-600">See the AI in action</p>
            </div>
            <div className="text-center p-6 bg-white rounded-xl border border-gray-200">
              <div className="text-3xl font-bold text-green-600 mb-2">Free Trial</div>
              <p className="text-gray-600">Get started immediately</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-200 bg-white mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-sm text-gray-600">
            © {new Date().getFullYear()} AutoRev LLC. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  )
}
