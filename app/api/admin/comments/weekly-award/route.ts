import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.response!;
  }

  return NextResponse.json(
    { success: false, error: 'Weekly comment awards are disabled.' },
    { status: 410 }
  );
}
