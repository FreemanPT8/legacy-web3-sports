import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { computeUnlockState } from '@/lib/education/unlockEngine';

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

    const unlockState = await computeUnlockState(user.id);

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
