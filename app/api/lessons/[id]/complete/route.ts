import { NextRequest, NextResponse } from 'next/server';
import {
  awardXP,
  hasCompletedContent,
  markContentComplete,
} from '@/lib/xp';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { userId, xpEarned } = body;

    if (!userId || !xpEarned) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or xpEarned' },
        { status: 400 },
      );
    }

    const lessonId = params.id;

    // 1) Já completa?
    const already = await hasCompletedContent(
      userId,
      lessonId,
      'lesson',
    );
    if (already) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lesson already completed',
        },
        { status: 409 },
      );
    }

    // 2) Registar em lesson_completions
    const completeResult = await markContentComplete(
      userId,
      lessonId,
      'lesson',
      xpEarned,
    );

    if (!completeResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            completeResult.error || 'Failed to mark lesson complete',
        },
        { status: 500 },
      );
    }

    // 3) Atribuir XP
    const xpResult = await awardXP(
      userId,
      'Complete lesson',
      xpEarned,
      lessonId,
      'lesson',
    );

    if (!xpResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: xpResult.error || 'Failed to award XP for lesson',
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      newTotal: xpResult.newTotal,
    });
  } catch (error) {
    console.error('Error in POST /api/lessons/[id]/complete:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
