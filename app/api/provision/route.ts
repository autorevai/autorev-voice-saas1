import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@/lib/db';
import { provisionVapiAssistant } from '@/services/vapi-provisioner';
import type { BusinessProfile } from '@/lib/types/provisioning';

export async function POST(req: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get tenant
    const db = createServiceClient();
    const { data: userRecord } = await db
      .from('users')
      .select('tenant_id, tenants(id, name)')
      .eq('id', user.id)
      .single();

    if (!userRecord?.tenant_id) {
      return NextResponse.json({ error: 'No tenant found' }, { status: 400 });
    }

    // 3. Parse request body
    const profile: BusinessProfile = await req.json();

    // 4. Call provisioning service
    const result = await provisionVapiAssistant({
      tenantId: userRecord.tenant_id,
      businessName: (userRecord.tenants as any).name,
      profile
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 5. Save to database
    const { error: assistantError } = await db.from('assistants').insert({
      tenant_id: userRecord.tenant_id,
      vapi_assistant_id: result.assistantId,
      vapi_number_id: result.phoneNumber,
      name: `${(userRecord.tenants as any).name} Receptionist`,
      status: 'active',
      system_prompt: '...', // Store the built prompt
      playbook_config: profile
    });

    if (assistantError) throw assistantError;

    // 6. Update tenant
    const { error: tenantError } = await db.from('tenants').update({
      industry: profile.industry,
      service_area: profile.serviceArea,
      business_hours: profile.businessHours,
      emergency_keywords: profile.emergencyKeywords,
      routing_config: profile.routingConfig,
      setup_completed: true
    }).eq('id', userRecord.tenant_id);

    if (tenantError) throw tenantError;

    // 7. Initialize plan period (Starter plan = 60 minutes)
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    await db.from('tenant_plans').insert({
      tenant_id: userRecord.tenant_id,
      plan_code: 'starter'
    });

    await db.from('plan_periods').insert({
      tenant_id: userRecord.tenant_id,
      period_start: today.toISOString().split('T')[0],
      period_end: nextMonth.toISOString().split('T')[0],
      minutes_included: 60,
      status: 'active'
    });

    return NextResponse.json({
      success: true,
      phoneNumber: result.phoneNumber,
      assistantId: result.assistantId
    });

  } catch (error: any) {
    console.error('Provisioning error:', error);
    return NextResponse.json({ 
      error: error.message || 'Provisioning failed' 
    }, { status: 500 });
  }
}
