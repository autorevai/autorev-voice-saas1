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
    const body = await req.json();
    const { businessPhone, ...profile } = body;

    // 4. Call provisioning service
    const result = await provisionVapiAssistant({
      businessName: (userRecord.tenants as any).name,
      profile: {
        industry: profile.industry || 'hvac',
        serviceArea: profile.serviceArea || ['43068'],
        businessHours: {
          weekdays: '8am-5pm',
          weekends: '9am-3pm',
          emergency: true,
          emergencyPhone: businessPhone || '7407393487'
        },
        routingConfig: profile.routingConfig || {
          teamMembers: [{
            name: 'Team Member',
            phone: businessPhone || '7407393487',
            role: 'technician'
          }]
        }
      }
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // 5. Save to database
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/vapi/webhook`
    
    const { error: assistantError } = await db.from('assistants').insert({
      tenant_id: userRecord.tenant_id,
      vapi_assistant_id: result.assistantId,
      vapi_number_id: result.phoneNumber,
      name: `${(userRecord.tenants as any).name} Receptionist`,
      status: 'active',
      webhook_url: webhookUrl,
      settings_json: {
        system_prompt: 'AI receptionist for ' + (userRecord.tenants as any).name,
        playbook_config: profile
      }
    });

    if (assistantError) throw assistantError;

    // 6. Update tenant (simplified - only essential fields)
    const { error: tenantError } = await db.from('tenants').update({
      setup_completed: true
    }).eq('id', userRecord.tenant_id);

    if (tenantError) throw tenantError;

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
