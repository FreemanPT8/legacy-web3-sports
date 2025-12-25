import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { getEducationProgressSummary } from '@/lib/education/progressSummary';
import { buildFallbackProgressSummary } from '@/lib/education/fallbackSummary';
import { START_HERE_FALLBACK_ID } from '@/lib/education/unlockLogic';

export async function GET(request: NextRequest) {
  try {
    const headerToken = request.headers.get('Authorization');
    const cookieToken =
      request.cookies.get('sb-access-token')?.value ||
      request.cookies.get('token')?.value ||
      null;

    const bearerToken =
      headerToken ||
      (cookieToken ? `Bearer ${cookieToken}` : null);

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

    let unlockState;
    try {
      const summary = await getEducationProgressSummary(user.id);
      unlockState = {
        startHere: summary.startHere,
        levels: summary.levels,
        coursesByLevel: summary.coursesByLevel,
      };
    } catch (summaryError) {
      console.error(
        'unlock-state summary failed, falling back to local summary:',
        summaryError,
      );
      const fallback = buildFallbackProgressSummary({
        xpTotal: user.xp_total,
        startCourseSlug: START_HERE_FALLBACK_ID,
      });
      unlockState = {
        startHere: fallback.startHere,
        levels: fallback.levels,
        coursesByLevel: fallback.coursesByLevel,
      };
    }

    return NextResponse.json(
      { success: true, unlockState },
      { status: 200 },
    );
  } catch (error) {
    console.error('GET /api/education/unlock-state error:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
