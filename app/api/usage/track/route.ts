import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { trackUsage } from '@/lib/stripe/usage'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId, minutesUsed, periodStart, periodEnd } = await req.json()
    
    if (!tenantId || minutesUsed === undefined || !periodStart || !periodEnd) {
      return NextResponse.json({ 
        error: 'Missing required fields: tenantId, minutesUsed, periodStart, periodEnd' 
      }, { status: 400 })
    }

    // Verify user has access to tenant
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('id', tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Track usage
    const usageRecord = await trackUsage({
      tenantId,
      minutesUsed: parseInt(minutesUsed),
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
    })

    return NextResponse.json({ 
      success: true,
      usage: usageRecord 
    })
    
  } catch (error) {
    console.error('Usage tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track usage' },
      { status: 500 }
    )
  }
}
