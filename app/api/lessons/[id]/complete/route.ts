import { NextRequest, NextResponse } from 'next/server';
import {
  awardXP,
  hasCompletedContent,
  markContentComplete,
} from '@/lib/xp';
import { supabase, supabaseAdmin } from '@/lib/supabase';

const db = supabaseAdmin ?? supabase;

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { userId, xpEarned } = body;

    if (!userId || typeof xpEarned !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing userId or xpEarned' },
        { status: 400 },
      );
    }

    const lessonId = params.id;

    // 0) Descobrir quem é o autor da lição
    let isAuthor = false;
    let authorId: string | null = null;

    try {
      const { data: lessonRow, error: lessonError } = await db
        .from('lessons')
        .select('id, author_id')
        .eq('id', lessonId)
        .maybeSingle();

      if (!lessonError && lessonRow) {
        authorId = lessonRow.author_id ?? null;
        if (authorId && authorId === userId) {
          isAuthor = true;
        }
      } else if (lessonError) {
        console.error('Error fetching lesson for creator bonus:', lessonError);
      }
    } catch (e) {
      console.error('Fatal error loading lesson author:', e);
    }

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
          alreadyCompleted: true,
        },
        { status: 409 },
      );
    }

    // 2) Registar em lesson_completions
    //    se for autor → xp_earned = 0
    const xpToStore = isAuthor ? 0 : xpEarned;

    const completeResult = await markContentComplete(
      userId,
      lessonId,
      'lesson',
      xpToStore,
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

    // 3) Se for autor → não ganha XP, apenas fica marcado como completo
    if (isAuthor) {
      return NextResponse.json({
        success: true,
        newTotal: undefined,
        isAuthor: true,
      });
    }

    // 4) Atribuir XP ao utilizador que completou a lição
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

    // 5) Bónus de criador (19%) para o autor da lição
    try {
      if (authorId && authorId !== userId) {
        const creatorBonus = Math.floor(xpEarned * 0.19);
        if (creatorBonus > 0) {
          const creatorResult = await awardXP(
            authorId,
            'Creator bonus: lesson completed',
            creatorBonus,
            lessonId,
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
    } catch (e) {
      console.error('Fatal error awarding creator bonus (lesson):', e);
    }

    return NextResponse.json({
      success: true,
      newTotal: xpResult.newTotal,
      isAuthor: false,
    });
  } catch (error) {
    console.error('Error in POST /api/lessons/[id]/complete:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
