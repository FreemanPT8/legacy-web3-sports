// app/api/lessons/[id]/complete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import {
  awardXP,
  hasCompletedContent,
  markContentComplete,
} from '@/lib/xp';

interface RouteContext {
  params: { id: string };
}

// Usamos o client admin sempre que existir (produção)
const db = supabaseAdmin ?? supabase;

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

    // 1) Obter lição (para saber autor e XP base)
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .select('id, author_id, xp_reward')
      .eq('id', id)
      .maybeSingle();

    if (lessonError) {
      console.error('Error fetching lesson in /complete:', lessonError);
      return NextResponse.json(
        { success: false, error: 'Failed to load lesson' },
        { status: 500 },
      );
    }

    if (!lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const authorId = lesson.author_id as string | null;
    const baseLessonXP =
      typeof lesson.xp_reward === 'number' && Number.isFinite(lesson.xp_reward)
        ? lesson.xp_reward
        : 0;

    // 2) Já completou esta lição?
    const alreadyCompleted = await hasCompletedContent(userId, id, 'lesson');

    if (alreadyCompleted) {
      return NextResponse.json({
        success: true,
        alreadyCompleted: true,
        message: 'Lesson already completed',
      });
    }

    // 3) Determinar o XP do leitor
    //    - Cliente pode sugerir xpEarned, mas o servidor decide.
    //    - Nunca damos mais do que xp_reward da lição.
    const requestedXp =
      typeof xpEarned === 'number' && Number.isFinite(xpEarned)
        ? xpEarned
        : baseLessonXP;

    const safeReaderXP = Math.max(0, Math.min(requestedXp, baseLessonXP));

    // Criador nunca ganha XP por consumir a própria lição
    const effectiveXpForReader =
      authorId && authorId === userId ? 0 : safeReaderXP;

    // 4) Registar conclusão em lesson_completions
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

    // 5) Atribuir XP ao leitor (pode ser 0 se for o autor)
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

    // 6) Bónus de criador (19% do XP do leitor),
    //    só se existir autor, não for o próprio leitor,
    //    e apenas se houver XP positivo nessa leitura
    if (authorId && authorId !== userId && effectiveXpForReader > 0) {
      const creatorBonus = Math.floor(effectiveXpForReader * 0.19);

      if (creatorBonus > 0) {
        const creatorResult = await awardXP(
          authorId,
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
          // Não falhamos a resposta ao utilizador por causa disto
        }
      }
    }

    return NextResponse.json({
      success: true,
      newTotal: readerNewTotal, // pode vir undefined se for o autor
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
