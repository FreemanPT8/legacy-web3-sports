import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { runWeeklyCommentAward } from '@/lib/server/commentAwards';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) {
    return auth.response!;
  }

  const result = await runWeeklyCommentAward();

  if (!result.success) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
