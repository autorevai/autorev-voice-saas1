import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { syncUsageToStripe } from '@/lib/stripe/usage'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tenantId } = await req.json()
    
    if (!tenantId) {
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
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

    // Sync usage to Stripe
    const result = await syncUsageToStripe(tenantId)

    return NextResponse.json({ 
      success: true,
      synced: result.synced 
    })
    
  } catch (error) {
    console.error('Usage sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync usage' },
      { status: 500 }
    )
  }
}
