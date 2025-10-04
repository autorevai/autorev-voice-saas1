// app/api/provision/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { provisionAssistantForTenant } from '@/services/vapi';

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

    // TODO: persist result.assistantId and result.phoneNumber to your DB for this tenant
    return NextResponse.json({ success: true, ...result });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: String(e?.message || e) }, { status: 500 });
  }
}
