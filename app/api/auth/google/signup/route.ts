import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/auth'

export async function GET(req: NextRequest) {
  // Generate Google OAuth URL with state for signup flow
  const authUrl = getGoogleAuthUrl('signup')
  return NextResponse.redirect(authUrl)
}
