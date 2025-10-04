// app/api/provision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { provisionAssistantForTenant } from '@/services/vapi';
import { createClient } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { tenantId, businessName, market } = body || {};
    if (!tenantId || !businessName || !market) {
      return NextResponse.json({ error: 'tenantId, businessName, market required' }, { status: 400 });
    }

    const result = await provisionAssistantForTenant({
      id: tenantId,
      businessName,
      market,
    });

    // Persist assistant data to database
    const db = createClient();
    const { error: dbError } = await db
      .from('assistants')
      .insert({
        tenant_id: tenantId,
        vapi_assistant_id: result.assistantId,
        vapi_number_id: result.phoneNumber,
        name: `${businessName} Receptionist`,
        status: 'active',
        settings_json: {
          market,
          businessName,
          provisionedAt: new Date().toISOString()
        }
      });

    if (dbError) {
      console.error('Failed to save assistant to database:', dbError);
      // Don't fail the request, just log the error
    }

    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
