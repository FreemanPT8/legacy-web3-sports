import { NextRequest, NextResponse } from 'next/server';

import { scanHouseCapacityAlerts } from '@/lib/houses/alerts';

const SECRET = process.env.HOUSES_ALERTS_CRON_SECRET;

async function handleRequest(request: NextRequest) {
  if (!SECRET) {
    return NextResponse.json({ success: false, error: 'Alert secret not configured.' }, { status: 500 });
  }
  const providedSecret = request.headers.get('x-cron-secret') ?? request.nextUrl.searchParams.get('secret');
  if (providedSecret !== SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const summary = await scanHouseCapacityAlerts();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[admin/houses/alerts/run] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to process alerts.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handleRequest(request);
}
