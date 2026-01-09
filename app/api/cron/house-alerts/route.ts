import { NextRequest, NextResponse } from 'next/server';

import { scanHouseCapacityAlerts } from '@/lib/houses/alerts';

function authorize(request: NextRequest) {
  const secret = process.env.HOUSE_ALERT_CRON_SECRET;
  if (!secret) return true;
  const headerSecret =
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization') ||
    request.headers.get('x-vercel-signature');
  return headerSecret === secret;
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized cron call.' }, { status: 401 });
  }
  try {
    const summary = await scanHouseCapacityAlerts(null);
    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('[cron/house-alerts] scan failed', error);
    return NextResponse.json({ success: false, error: 'Failed to run alert scan.' }, { status: 500 });
  }
}
