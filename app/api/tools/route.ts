// app/api/tools/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
  }

  const tool = req.headers.get('x-tool-name') || '';
  const args = await req.json().catch(() => ({}));

  if (tool === 'create_booking') {
    const windowStr = normalizeWindow(args.window || '8 to 11');
    // TODO: optionally persist to Supabase here
    return NextResponse.json({
      success: true,
      status: 'booked',
      window: windowStr,
      say: `You're all set. We'll see you ${windowStr}.`,
      end_conversation: true,
      received: pick(args, ['name','phone','address','city','state','zip','summary','equipment','window']),
    });
  }

  return NextResponse.json({ success: false, error: 'unknown_tool' }, { status: 400 });
}

function authorized(req: NextRequest) {
  const header = req.headers.get('x-shared-secret') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  const expected = process.env.WEBHOOK_SHARED_SECRET || '';
  return !!expected && token === expected;
}

function normalizeWindow(w: string) {
  return String(w).replace(/-/g, ' to ').replace(/\s+to\s+/g, ' to ').trim();
}

function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> {
  const out: Partial<T> = {};
  keys.forEach(k => { if (obj && k in obj) (out as any)[k] = (obj as any)[k]; });
  return out;
}
