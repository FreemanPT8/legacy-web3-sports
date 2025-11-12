import { NextRequest, NextResponse } from 'next/server';
import { hasCompletedContent, markContentComplete } from '@/lib/xp';
import { awardXP } from '@/lib/xp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { userId, xpEarned } = body;
    const lessonId = params.id;

    if (!userId || !lessonId || !xpEarned) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const alreadyCompleted = await hasCompletedContent(userId, lessonId, 'lesson');

    if (alreadyCompleted) {
      return NextResponse.json(
        { success: false, error: 'Lesson already completed' },
        { status: 400 }
      );
    }

    const markResult = await markContentComplete(userId, lessonId, 'lesson', xpEarned);

    if (!markResult.success) {
      return NextResponse.json(markResult, { status: 500 });
    }

    const xpResult = await awardXP(
      userId,
      'Completed lesson',
      xpEarned,
      lessonId,
      'lesson'
    );

    if (!xpResult.success) {
      return NextResponse.json(xpResult, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      xpEarned,
      newTotal: xpResult.newTotal
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
