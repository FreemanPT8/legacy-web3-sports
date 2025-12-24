import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getEducationProgressSummary } from '@/lib/education/progressSummary';
import { buildFallbackProgressSummary } from '@/lib/education/fallbackSummary';
import type { ProgressSummary } from '@/lib/education/progressSummary';

export async function GET(request: NextRequest) {
  try {
    const headerToken = request.headers.get('Authorization');
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('token')?.value ||
      null;

    const bearerToken =
      headerToken || (cookieToken ? `Bearer ${cookieToken}` : null);

    if (!bearerToken) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const user = await verifyAuth(bearerToken);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    let summary: ProgressSummary;
    try {
      summary = await getEducationProgressSummary(user.id);
    } catch (summaryErr) {
      console.error(
        'getEducationProgressSummary failed, falling back to default summary:',
        summaryErr,
      );
      summary = buildFallbackProgressSummary({
        xpTotal: user.xp_total,
        startCourseSlug: 'comeca-aqui',
      });
    }

    return NextResponse.json(
      { success: true, summary },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/education/progress error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
