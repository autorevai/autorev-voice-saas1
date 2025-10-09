// app/api/auth/callback/google/route.ts
// Redirect wrapper to handle Google OAuth callback at /api/auth/callback/google
// This exists because Google Cloud Console URIs are configured as /api/auth/callback/google
// but our actual handler is at /api/auth/google/callback

import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams

  // Build the target URL with all query params
  const targetUrl = new URL('/api/auth/google/callback', req.url)

  // Copy all query parameters
  searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value)
  })

  // Redirect to the actual handler
  return NextResponse.redirect(targetUrl)
}
