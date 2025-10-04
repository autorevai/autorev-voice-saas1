// app/api/debug-env/route.ts
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Security: Only allow in non-production or with secret
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  
  if (process.env.NODE_ENV === 'production' && secret !== process.env.DEBUG_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  return NextResponse.json({
    env: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    hasPublicUrl: !!supabaseUrl,
    hasPublicKey: !!supabaseKey,
    hasServiceKey: !!serviceKey,
    urlPrefix: supabaseUrl?.slice(0, 20) || 'NOT_SET',
    keyPrefix: supabaseKey?.slice(0, 10) || 'NOT_SET',
    allSupabaseKeys: Object.keys(process.env).filter(k => 
      k.toLowerCase().includes('supabase')
    ),
    timestamp: new Date().toISOString()
  })
}
