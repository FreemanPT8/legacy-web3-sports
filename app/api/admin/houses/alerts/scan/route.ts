import { NextRequest, NextResponse } from 'next/server';

import { requireAdmin } from '@/lib/middleware';
import { scanHouseCapacityAlerts } from '@/lib/houses/alerts';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  try {
    const summary = await scanHouseCapacityAlerts();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error('[admin/houses/alerts/scan] failed', error);
    return NextResponse.json({ success: false, error: 'Failed to scan alerts.' }, { status: 500 });
  }
}
