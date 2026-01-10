import { NextRequest, NextResponse } from 'next/server';

import { scanHouseCapacityAlerts } from '@/lib/houses/alerts';

const CRON_SECRET = process.env.HOUSES_ALERTS_CRON_SECRET;

function extractToken(request: NextRequest) {
  const headerToken = request.headers.get('x-cron-secret');
  if (headerToken) return headerToken.trim();
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }
  const queryToken = request.nextUrl.searchParams.get('token');
  return queryToken ? queryToken.trim() : null;
}

export async function POST(request: NextRequest) {
  const token = extractToken(request);
  if (!CRON_SECRET) {
    return NextResponse.json(
      {
        success: false,
        error: 'HOUSES_ALERTS_CRON_SECRET is not configured on the server.',
      },
      { status: 500 },
    );
  }
  if (!token || token !== CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const summary = await scanHouseCapacityAlerts('cron-worker');
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[admin/houses/alerts/run] scheduled scan failed', error);
    return NextResponse.json({ success: false, error: 'Failed to execute alert scan.' }, { status: 500 });
  }
}
