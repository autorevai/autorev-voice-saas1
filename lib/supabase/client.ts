// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Handle missing environment variables gracefully during build
  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window === 'undefined') {
      // Server-side/build-time: return mock client to prevent build failures
      console.warn('[Build] Supabase env vars not set - using mock client')
    } else {
      // Client-side runtime: log error for debugging
      console.error('[Runtime] Missing Supabase environment variables')
    }

    // Return mock client with minimal interface to prevent crashes
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

  // Create real Supabase client when env vars are available
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}