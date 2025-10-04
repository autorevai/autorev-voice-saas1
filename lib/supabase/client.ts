// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Handle missing environment variables gracefully
  if (!supabaseUrl || !supabaseAnonKey) {
    const isBuildTime = typeof window === 'undefined'
    
    if (isBuildTime) {
      // Server-side/build-time: log warning and return mock client
      console.warn('[Build] Supabase environment variables not configured - using mock client')
    } else {
      // Client-side runtime: log error for debugging
      console.error('[Runtime] Missing Supabase environment variables. Please check your configuration.')
    }

    // Return comprehensive mock client that won't crash
    return {
      auth: {
        signUp: async (credentials: any) => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Supabase not configured - signUp failed', status: 500 } 
        }),
        signInWithPassword: async (credentials: any) => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Supabase not configured - signInWithPassword failed', status: 500 } 
        }),
        signInWithOtp: async (credentials: any) => ({ 
          data: null, 
          error: { message: 'Supabase not configured - signInWithOtp failed', status: 500 } 
        }),
        signOut: async () => ({ 
          error: { message: 'Supabase not configured - signOut failed', status: 500 } 
        }),
        getUser: async () => ({ 
          data: { user: null }, 
          error: { message: 'Supabase not configured - getUser failed', status: 500 } 
        }),
        getSession: async () => ({ 
          data: { session: null }, 
          error: { message: 'Supabase not configured - getSession failed', status: 500 } 
        }),
        onAuthStateChange: (callback: any) => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
        refreshSession: async () => ({ 
          data: { session: null }, 
          error: { message: 'Supabase not configured - refreshSession failed', status: 500 } 
        }),
      },
      from: (table: string) => ({
        select: (columns?: string) => ({
          eq: (column: string, value: any) => ({
            single: async () => ({ 
              data: null, 
              error: { message: `Supabase not configured - select from ${table} failed`, status: 500 } 
            }),
            then: async (callback: any) => ({ 
              data: null, 
              error: { message: `Supabase not configured - select from ${table} failed`, status: 500 } 
            }),
          }),
          order: (column: string, options?: any) => ({
            limit: async (count: number) => ({ 
              data: [], 
              error: { message: `Supabase not configured - select from ${table} failed`, status: 500 } 
            }),
            then: async (callback: any) => ({ 
              data: [], 
              error: { message: `Supabase not configured - select from ${table} failed`, status: 500 } 
            }),
          }),
          then: async (callback: any) => ({ 
            data: [], 
            error: { message: `Supabase not configured - select from ${table} failed`, status: 500 } 
          }),
        }),
        insert: async (data: any) => ({ 
          data: null, 
          error: { message: `Supabase not configured - insert into ${table} failed`, status: 500 } 
        }),
        update: async (data: any) => ({ 
          data: null, 
          error: { message: `Supabase not configured - update ${table} failed`, status: 500 } 
        }),
        delete: async () => ({ 
          data: null, 
          error: { message: `Supabase not configured - delete from ${table} failed`, status: 500 } 
        }),
        upsert: async (data: any) => ({ 
          data: null, 
          error: { message: `Supabase not configured - upsert into ${table} failed`, status: 500 } 
        }),
      }),
      storage: {
        from: (bucket: string) => ({
          upload: async (path: string, file: any) => ({ 
            data: null, 
            error: { message: `Supabase not configured - upload to ${bucket} failed`, status: 500 } 
          }),
          download: async (path: string) => ({ 
            data: null, 
            error: { message: `Supabase not configured - download from ${bucket} failed`, status: 500 } 
          }),
          remove: async (paths: string[]) => ({ 
            data: null, 
            error: { message: `Supabase not configured - remove from ${bucket} failed`, status: 500 } 
          }),
        }),
      },
    } as any
  }

  // Create real Supabase client when environment variables are available
  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('[Supabase] Failed to create client:', error)
    
    // Return mock client as fallback even if createBrowserClient fails
    return {
      auth: {
        signUp: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        signInWithPassword: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        signInWithOtp: async () => ({ 
          data: null, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        signOut: async () => ({ 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        getUser: async () => ({ 
          data: { user: null }, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        getSession: async () => ({ 
          data: { session: null }, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
        onAuthStateChange: () => ({ 
          data: { 
            subscription: { 
              unsubscribe: () => {} 
            } 
          } 
        }),
        refreshSession: async () => ({ 
          data: { session: null }, 
          error: { message: 'Supabase client creation failed', status: 500 } 
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
            then: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
          }),
          order: () => ({
            limit: async () => ({ data: [], error: { message: 'Supabase client creation failed', status: 500 } }),
            then: async () => ({ data: [], error: { message: 'Supabase client creation failed', status: 500 } }),
          }),
          then: async () => ({ data: [], error: { message: 'Supabase client creation failed', status: 500 } }),
        }),
        insert: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
        update: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
        delete: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
        upsert: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
      }),
      storage: {
        from: () => ({
          upload: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
          download: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
          remove: async () => ({ data: null, error: { message: 'Supabase client creation failed', status: 500 } }),
        }),
      },
    } as any
  }
}