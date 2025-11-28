import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  hasCompletedContent,
  markContentComplete,
  awardXP,
  updateStreak,
} from '@/lib/xp';

/**
 * This route handles lesson completion logic:
 *
 * - Users earn XP only on first completion
 * - Creators NEVER earn XP for consuming their own content
 * - Creators earn 19% of the XP awarded to each new reader (only on reader’s first completion)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const lessonId = params.id;
    const body = await request.json();

    const userId = body?.userId as string | undefined;
    const xpFromClient = body?.xpEarned as number | undefined;

    if (!userId || !lessonId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId or lessonId' },
        { status: 400 },
      );
    }

    // -------------------------------------------------------------
    // 1. Load lesson basics
    // -------------------------------------------------------------
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, author_id, xp_reward')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const isCreator = lesson.author_id === userId;
    const lessonAuthorId = lesson.author_id;

    // -------------------------------------------------------------
    // 2. If creator consumes their own content → NEVER earn XP
    // -------------------------------------------------------------
    if (isCreator) {
      return NextResponse.json({
        success: true,
        isCreator: true,
        alreadyCompleted: false,
        xpEarned: 0,
        newTotal: undefined,
      });
    }

    // -------------------------------------------------------------
    // 3. Check if user already completed this lesson earlier
    // -------------------------------------------------------------
    const alreadyCompleted = await hasCompletedContent(
      userId,
      lessonId,
      'lesson',
    );

    if (alreadyCompleted) {
      // The user does not earn XP again
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        xpEarned: 0,
        newTotal: undefined,
      });
    }

    // -------------------------------------------------------------
    // 4. Determine XP to award to the READER
    // -------------------------------------------------------------
    const xpToAward =
      typeof xpFromClient === 'number' && xpFromClient > 0
        ? xpFromClient
        : typeof lesson.xp_reward === 'number'
        ? lesson.xp_reward
        : 0;

    // -------------------------------------------------------------
    // 5. Mark lesson as completed for the USER
    // -------------------------------------------------------------
    const markResult = await markContentComplete(
      userId,
      lessonId,
      'lesson',
      xpToAward,
    );

    if (!markResult.success) {
      return NextResponse.json(
        { success: false, error: 'Failed to mark completion' },
        { status: 500 },
      );
    }

    // -------------------------------------------------------------
    // 6. Award XP to the READER
    // -------------------------------------------------------------
    let newTotal: number | undefined = undefined;

    if (xpToAward > 0) {
      const xpResult = await awardXP(
        userId,
        'lesson_complete',
        xpToAward,
        lessonId,
        'lesson',
      );

      if (!xpResult.success) {
        return NextResponse.json(
          { success: false, error: 'Failed to award XP to reader' },
          { status: 500 },
        );
      }

      newTotal = xpResult.newTotal;
      await updateStreak(userId);
    }

    // -------------------------------------------------------------
    // 7. Pay AUTHOR BONUS → 19% of reader XP (only first read)
    // -------------------------------------------------------------
    if (lessonAuthorId && xpToAward > 0) {
      const bonus = Math.floor(xpToAward * 0.19);

      if (bonus > 0 && lessonAuthorId !== userId) {
        await awardXP(
          lessonAuthorId,
          'author_bonus',
          bonus,
          lessonId,
          'lesson_author_bonus',
        );
      }
    }

    // -------------------------------------------------------------
    // 8. Return final response
    // -------------------------------------------------------------
    return NextResponse.json({
      success: true,
      alreadyCompleted: false,
      xpEarned: xpToAward,
      newTotal,
    });
  } catch (error) {
    console.error('Error in POST /api/lessons/[id]/complete:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
