import { NextResponse } from 'next/server';

import type { OnboardingLogEntry, OnboardingLogAction } from '@/types/onboarding';

const LOG_LIMIT = 200;
const logs: OnboardingLogEntry[] = [];

const pushLog = (entry: OnboardingLogEntry) => {
  logs.push(entry);
  if (logs.length > LOG_LIMIT) {
    logs.splice(0, logs.length - LOG_LIMIT);
  }
};

export async function GET() {
  return NextResponse.json({ success: true, logs: logs.slice(-50).reverse() });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      popupId?: string;
      action?: OnboardingLogAction;
      house?: string;
    };
    if (!body.popupId || !body.action) {
      return NextResponse.json({ success: false, error: 'Missing popupId or action' }, { status: 400 });
    }
    const entry: OnboardingLogEntry = {
      id: crypto.randomUUID(),
      popupId: body.popupId,
      action: body.action,
      timestamp: Date.now(),
      house: body.house ?? 'LEGACY',
    };
    pushLog(entry);
    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('[onboarding.logs] POST failed', error);
    return NextResponse.json({ success: false, error: 'Failed to record log' }, { status: 500 });
  }
}
