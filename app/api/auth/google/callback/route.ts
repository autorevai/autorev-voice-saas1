import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@/lib/db'
import { getGoogleTokens, getGoogleUserInfo } from '@/lib/google/auth'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state') || 'signup'
  const error = searchParams.get('error')

  // Handle OAuth errors
  if (error || !code) {
    return NextResponse.redirect(
      new URL(`/signup?error=oauth_failed`, req.url)
    )
  }

  try {
    // Exchange code for tokens
    const tokens = await getGoogleTokens(code)

    // Get user info from Google
    const userInfo = await getGoogleUserInfo(tokens.access_token!)

    // Create or sign in user with Supabase
    const supabase = await createClient()
    const db = createServiceClient()

    // Check if user exists by Google ID
    const { data: existingUser } = await db
      .from('users')
      .select('id, email')
      .eq('google_id', userInfo.id)
      .single()

    if (existingUser) {
      // User exists - update their Google tokens
      await db
        .from('users')
        .update({
          google_access_token: tokens.access_token,
          google_refresh_token: tokens.refresh_token,
          google_token_expires_at: tokens.expiry_date
            ? new Date(tokens.expiry_date)
            : null,
        })
        .eq('id', existingUser.id)

      // Sign them in using Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: existingUser.email,
        password: userInfo.id!, // Use Google ID as password for OAuth users
      })

      if (signInError) {
        console.error('Sign in error:', signInError)
        return NextResponse.redirect(
          new URL(`/signup?error=signin_failed`, req.url)
        )
      }

      return NextResponse.redirect(new URL('/dashboard', req.url))
    }

    // New user - create account
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: userInfo.email!,
      password: userInfo.id!, // Use Google ID as password
      options: {
        data: {
          full_name: userInfo.name,
          avatar_url: userInfo.picture,
        },
      },
    })

    if (signUpError || !authData.user) {
      throw new Error(signUpError?.message || 'Failed to create user')
    }

    // Store Google tokens
    await db
      .from('users')
      .update({
        google_id: userInfo.id,
        google_access_token: tokens.access_token,
        google_refresh_token: tokens.refresh_token,
        google_token_expires_at: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : null,
      })
      .eq('id', authData.user.id)

    // Redirect based on state
    if (state === 'connect_calendar') {
      // Calendar connection from settings
      return NextResponse.redirect(
        new URL('/settings?calendar_connected=true', req.url)
      )
    }

    // Both signup and existing users go to dashboard
    // Dashboard shows setup wizard if tenant.setup_completed is false
    return NextResponse.redirect(new URL('/dashboard', req.url))

  } catch (error: any) {
    console.error('Google OAuth error:', error)
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(error.message)}`, req.url)
    )
  }
}
