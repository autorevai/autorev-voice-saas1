import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/auth'

export async function GET(req: NextRequest) {
  // Generate Google OAuth URL with state for login flow
  const authUrl = getGoogleAuthUrl('login')
  return NextResponse.redirect(authUrl)
}
