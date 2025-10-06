import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Helper to log with timestamps
function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logData = data ? JSON.stringify(data, null, 2) : '';
  console.log(`[${timestamp}] [SUPABASE_CLIENT_${level}] ${message}`, logData);
}

export function createClient() {
  const startTime = Date.now();
  
  try {
    // Use service_role key for server-side operations that bypass RLS
    // Use anon key for client-side operations that respect RLS policies
    const supabaseUrl = process.env.SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    log('INFO', 'Creating Supabase client', {
      url: supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      serviceKeyLength: supabaseServiceKey?.length || 0,
      environment: process.env.NODE_ENV
    });
    
    const client = createSupabaseClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const duration = Date.now() - startTime;
    log('INFO', 'Supabase client created successfully', {
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    return client;
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    log('ERROR', 'Failed to create Supabase client', {
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      supabaseUrl: process.env.SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    
    throw error;
  }
}

// Database types based on our schema
export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          created_at?: string
          updated_at?: string
        }
      }
      users: {
        Row: {
          id: string
          email: string
          name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_tenants: {
        Row: {
          id: string
          user_id: string
          tenant_id: string
          role: 'owner' | 'admin' | 'user' | 'viewer'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tenant_id: string
          role?: 'owner' | 'admin' | 'user' | 'viewer'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tenant_id?: string
          role?: 'owner' | 'admin' | 'user' | 'viewer'
          created_at?: string
          updated_at?: string
        }
      }
      assistants: {
        Row: {
          id: string
          tenant_id: string
          vapi_assistant_id: string
          vapi_number_id: string | null
          name: string
          status: 'active' | 'inactive' | 'draft' | 'archived'
          settings_json: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          vapi_assistant_id: string
          vapi_number_id?: string | null
          name: string
          status?: 'active' | 'inactive' | 'draft' | 'archived'
          settings_json?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          vapi_assistant_id?: string
          vapi_number_id?: string | null
          name?: string
          status?: 'active' | 'inactive' | 'draft' | 'archived'
          settings_json?: any
          created_at?: string
          updated_at?: string
        }
      }
      calls: {
        Row: {
          id: string
          tenant_id: string
          assistant_id: string | null
          vapi_call_id: string
          started_at: string
          ended_at: string | null
          duration_sec: number | null
          cost_cents: number
          outcome: 'completed' | 'failed' | 'abandoned' | 'no_answer' | 'busy' | 'booked' | 'handoff' | 'unknown' | null
          transcript_url: string | null
          raw_json: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          assistant_id?: string | null
          vapi_call_id: string
          started_at: string
          ended_at?: string | null
          duration_sec?: number | null
          cost_cents?: number
          outcome?: 'completed' | 'failed' | 'abandoned' | 'no_answer' | 'busy' | 'booked' | 'handoff' | 'unknown' | null
          transcript_url?: string | null
          raw_json?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          assistant_id?: string | null
          vapi_call_id?: string
          started_at?: string
          ended_at?: string | null
          duration_sec?: number | null
          cost_cents?: number
          outcome?: 'completed' | 'failed' | 'abandoned' | 'no_answer' | 'busy' | 'booked' | 'handoff' | 'unknown' | null
          transcript_url?: string | null
          raw_json?: any
          created_at?: string
          updated_at?: string
        }
      }
      tool_results: {
        Row: {
          id: string
          call_id: string
          tool_name: string
          request_json: any
          response_json: any
          success: boolean
          created_at: string
        }
        Insert: {
          id?: string
          call_id: string
          tool_name: string
          request_json?: any
          response_json?: any
          success?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          call_id?: string
          tool_name?: string
          request_json?: any
          response_json?: any
          success?: boolean
          created_at?: string
        }
      }
      bookings: {
        Row: {
          id: string
          tenant_id: string
          call_id: string | null
          confirmation: string
          window_text: string
          start_ts: string
          duration_min: number
          name: string
          phone: string
          email: string | null
          address: string
          city: string | null
          state: string | null
          zip: string | null
          summary: string | null
          equipment: string | null
          priority: 'urgent' | 'high' | 'standard' | 'low'
          source: 'voice_call' | 'web_form' | 'api' | 'manual' | 'import'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          tenant_id: string
          call_id?: string | null
          confirmation: string
          window_text: string
          start_ts: string
          duration_min?: number
          name: string
          phone: string
          email?: string | null
          address: string
          city?: string | null
          state?: string | null
          zip?: string | null
          summary?: string | null
          equipment?: string | null
          priority?: 'urgent' | 'high' | 'standard' | 'low'
          source?: 'voice_call' | 'web_form' | 'api' | 'manual' | 'import'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          tenant_id?: string
          call_id?: string | null
          confirmation?: string
          window_text?: string
          start_ts?: string
          duration_min?: number
          name?: string
          phone?: string
          email?: string | null
          city?: string | null
          state?: string | null
          zip?: string | null
          summary?: string | null
          equipment?: string | null
          priority?: 'urgent' | 'high' | 'standard' | 'low'
          source?: 'voice_call' | 'web_form' | 'api' | 'manual' | 'import'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
