// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const isBuildTime = typeof window === 'undefined'
  const envStatus = {
    url: supabaseUrl ? `${supabaseUrl.slice(0, 30)}...` : 'MISSING',
    key: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 10)}...` : 'MISSING',
    isBuildTime,
    nodeEnv: process.env.NODE_ENV
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isBuildTime) {
      console.warn('[Supabase Client - Build] Environment variables missing:', envStatus)
      console.warn('This will cause runtime errors. Check Vercel environment variables.')
    } else {
      console.error('[Supabase Client - Runtime] Environment variables missing:', envStatus)
      console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in Vercel')
    }

    // Return mock client
    return {
      auth: {
        signUp: async () => ({ 
          data: { user: null, session: null }, 
          error: new Error('Supabase not configured') 
        }),
        signInWithPassword: async () => ({ 
          data: { user: null, session: null }, 
          error: new Error('Supabase not configured') 
        }),
        signInWithOtp: async () => ({ 
          data: null, 
          error: new Error('Supabase not configured') 
        }),
        signOut: async () => ({ error: null }),
        getUser: async () => ({ 
          data: { user: null }, 
          error: new Error('Supabase not configured') 
        }),
        getSession: async () => ({ 
          data: { session: null }, 
          error: null 
        }),
        onAuthStateChange: () => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            then: async () => ({ data: null, error: null }),
          }),
          order: () => ({
            limit: async () => ({ data: [], error: null }),
          }),
        }),
        insert: async () => ({ data: null, error: null }),
        update: async () => ({ data: null, error: null }),
        delete: async () => ({ data: null, error: null }),
      }),
    } as any
  }

  console.log('[Supabase Client] Initialized successfully:', {
    urlPrefix: supabaseUrl.slice(0, 30),
    keyPrefix: supabaseAnonKey.slice(0, 10),
    isBuildTime
  })

  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}