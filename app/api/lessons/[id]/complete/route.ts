import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  hasCompletedContent,
  markContentComplete,
  awardXP,
  updateStreak,
} from '@/lib/xp';

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

    // 1) Buscar lição para saber autor e xp_reward
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('id, author_id, xp_reward')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error(
        'Lesson not found in POST /api/lessons/[id]/complete:',
        lessonError,
      );
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const isCreator = lesson.author_id === userId;

    // 2) Se for criador: não marcamos complete nem damos XP
    if (isCreator) {
      return NextResponse.json({
        success: true,
        isCreator: true,
        alreadyCompleted: false,
        xpEarned: 0,
        newTotal: undefined,
      });
    }

    // 3) Verificar se já está completo para este utilizador
    const alreadyCompleted = await hasCompletedContent(
      userId,
      lessonId,
      'lesson',
    );

    if (alreadyCompleted) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        xpEarned: 0,
        newTotal: undefined,
      });
    }

    // 4) Determinar XP a atribuir
    const xpToAward =
      typeof xpFromClient === 'number' && xpFromClient > 0
        ? xpFromClient
        : typeof lesson.xp_reward === 'number'
          ? lesson.xp_reward
          : 0;

    // 5) Marcar lição como completa
    const markResult = await markContentComplete(
      userId,
      lessonId,
      'lesson',
      xpToAward,
    );

    if (!markResult.success) {
      console.error(
        'Error in markContentComplete for lesson:',
        markResult.error,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to mark lesson as complete' },
        { status: 500 },
      );
    }

    let newTotal: number | undefined = undefined;

    // 6) Atribuir XP (se > 0)
    if (xpToAward > 0) {
      const xpResult = await awardXP(
        userId,
        'lesson_complete',
        xpToAward,
        lessonId,
        'lesson',
      );

      if (!xpResult.success) {
        console.error('Error in awardXP for lesson:', xpResult.error);
        return NextResponse.json(
          { success: false, error: 'Failed to award XP' },
          { status: 500 },
        );
      }

      newTotal = xpResult.newTotal;

      // Atualizar streak diário (não é crítico se falhar)
      await updateStreak(userId);
    }

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
