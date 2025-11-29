import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

// Usamos sempre o client admin quando existir (bypass RLS)
const db = supabaseAdmin ?? supabase;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar lição
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .select('*')
      .eq('id', params.id)
      .maybeSingle();

    if (lessonError || !lesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    // 2) Buscar módulo + todas as lições do módulo (para prev/next)
    const { data: module, error: moduleError } = await db
      .from('modules')
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .eq('id', (lesson as any).module_id)
      .maybeSingle();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 },
      );
    }

    // 3) Determinar autor e se o utilizador atual é o criador
    let authorId: string | null =
      (lesson as any).author_id || (module as any).author_id || null;

    // Fallback: se não houver author_id mas o user for Admin/Super Admin,
    // assumimos que ele é o criador (fase inicial do Legacy)
    if (
      !authorId &&
      user &&
      (user.role === 'Admin' || user.role === 'Super Admin')
    ) {
      authorId = user.id;
    }

    let isCreator = false;
    if (user && authorId && user.id === authorId) {
      isCreator = true;
    }

    let authorName: string | null = null;
    if (authorId) {
      const { data: authorRow, error: authorError } = await db
        .from('users')
        .select('username')
        .eq('id', authorId)
        .maybeSingle();

      if (!authorError && authorRow) {
        authorName = (authorRow as any).username || null;
      }
    }

    // 4) Ver se a lição já foi concluída pelo utilizador (apenas se NÃO for criador)
    let isCompleted = false;

    if (user && !isCreator) {
      const { data: completion, error: completionError } = await db
        .from('lesson_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('lesson_id', params.id)
        .maybeSingle();

      if (!completionError && completion) {
        isCompleted = true;
      }
    }

    // 5) Estatísticas da lição (quantas vezes concluída, XP total distribuído)
    const { data: allCompletions, error: statsError } = await db
      .from('lesson_completions')
      .select('xp_earned')
      .eq('lesson_id', params.id);

    if (statsError) {
      console.error('Error fetching lesson completions stats:', statsError);
    }

    const completionsArray = allCompletions || [];
    const completedCount = completionsArray.length;
    const totalXpDistributed = completionsArray.reduce(
      (sum, row: any) => sum + (row.xp_earned || 0),
      0,
    );

    // 6) Montar resposta
    const enrichedLesson = {
      ...lesson,
      author_id: authorId,
      author_name: authorName,
    };

    return NextResponse.json({
      success: true,
      lesson: enrichedLesson,
      module,
      isCompleted,
      isCreator,
      stats: {
        completedCount,
        totalXpDistributed,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
