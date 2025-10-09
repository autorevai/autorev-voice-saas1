import { NextRequest, NextResponse } from 'next/server'
import { getGoogleAuthUrl } from '@/lib/google/auth'

export async function GET(req: NextRequest) {
  // Generate Google OAuth URL with state for calendar connection
  const authUrl = getGoogleAuthUrl('connect_calendar')
  return NextResponse.redirect(authUrl)
}
