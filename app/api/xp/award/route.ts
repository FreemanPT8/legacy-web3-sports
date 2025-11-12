import { NextRequest, NextResponse } from 'next/server';
import { awardXP, checkDailyLimit, updateDailyLimit } from '@/lib/xp';

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

    if (actionType) {
      const { canAward, remaining } = await checkDailyLimit(userId, actionType);

      if (!canAward) {
        return NextResponse.json(
          { success: false, error: 'Daily limit reached for this action' },
          { status: 429 }
        );
      }

      const actualXP = Math.min(xpAmount, remaining);

      const result = await awardXP(userId, action, actualXP, referenceId, referenceType);

      if (result.success) {
        await updateDailyLimit(userId, actionType, actualXP);
      }

      return NextResponse.json(result);
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
