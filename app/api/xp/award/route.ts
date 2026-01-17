import { NextRequest, NextResponse } from 'next/server';
import { awardXP } from '@/lib/xp';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, xpAmount, referenceId, referenceType, actionType } = body;

    if (!userId || !action || !xpAmount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await awardXP(userId, action, xpAmount, referenceId, referenceType);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
