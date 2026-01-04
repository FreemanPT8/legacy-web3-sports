// app/api/lessons/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  XP_REWARDS,
  awardXP,
  hasCompletedContent,
  markContentComplete,
} from '@/lib/xp';
import { fetchLessonContext } from '@/lib/lesson-context';
import { recordComboEvent } from '@/lib/comboMissions';

interface RouteContext {
  params: { id: string };
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing lesson id in route params' },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const { userId, xpEarned } = body || {};

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId' },
        { status: 400 },
      );
    }

    const { context: lessonContext, error: contextError } =
      await fetchLessonContext(id);

    if (!lessonContext || contextError) {
      return NextResponse.json(
        { success: false, error: contextError || 'Lesson not found' },
        { status: contextError ? 500 : 404 },
      );
    }

    const resolvedAuthorId = lessonContext.resolvedAuthorId;
    const baseLessonXP = Math.max(0, lessonContext.resolvedXP || 0);
    const effectiveLessonXP =
      baseLessonXP > 0 ? baseLessonXP : XP_REWARDS.LESSON_MIN;

    const alreadyCompleted = await hasCompletedContent(userId, id, 'lesson');

    if (alreadyCompleted) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Lesson already completed',
      });
    }

    const requestedXp =
      typeof xpEarned === 'number' && Number.isFinite(xpEarned)
        ? xpEarned
        : effectiveLessonXP;

    const safeReaderXP = Math.max(
      0,
      Math.min(requestedXp, effectiveLessonXP),
    );
    const effectiveXpForReader =
      resolvedAuthorId && resolvedAuthorId === userId ? 0 : safeReaderXP;

    const markResult = await markContentComplete(
      userId,
      id,
      'lesson',
      effectiveXpForReader,
    );

    if (!markResult.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            markResult.error ||
            'Failed to register lesson completion',
        },
        { status: 500 },
      );
    }

    let readerNewTotal: number | undefined;

    if (effectiveXpForReader > 0) {
      const awardResult = await awardXP(
        userId,
        'Lesson completed',
        effectiveXpForReader,
        id,
        'lesson',
      );

      if (!awardResult.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              awardResult.error ||
              'Failed to award XP for lesson completion',
          },
          { status: 500 },
        );
      }

      readerNewTotal = awardResult.newTotal;
    }

    if (
      resolvedAuthorId &&
      resolvedAuthorId !== userId &&
      effectiveXpForReader > 0
    ) {
      const creatorBonus = Math.floor(effectiveXpForReader * 0.19);

      if (creatorBonus > 0) {
        const creatorResult = await awardXP(
          resolvedAuthorId,
          'Creator reward: lesson completed',
          creatorBonus,
          id,
          'lesson_creator',
        );

        if (!creatorResult.success) {
          console.error(
            'Failed to award creator bonus for lesson:',
            creatorResult.error,
          );
        }
      }
    }

    await recordComboEvent(userId, 'lesson');

    return NextResponse.json({
      success: true,
      newTotal: readerNewTotal,
      alreadyCompleted: false,
    });
  } catch (error) {
    console.error('Error in POST /api/lessons/[id]/complete:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
