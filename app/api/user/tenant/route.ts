import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's tenant from users table
    const { data: userRecord, error: userError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (userError) {
      console.error('User record error:', userError)
      return NextResponse.json({ error: 'User not found in database' }, { status: 404 })
    }
    
    if (!userRecord?.tenant_id) {
      return NextResponse.json({ error: 'User has no tenant' }, { status: 404 })
    }

    return NextResponse.json({ 
      tenantId: userRecord.tenant_id,
      userId: user.id 
    })

  } catch (error) {
    console.error('Get tenant error:', error)
    return NextResponse.json(
      { error: 'Failed to get tenant' },
      { status: 500 }
    )
  }
}
