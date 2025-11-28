import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    const lessonId = params.id;

    // 1) Buscar lição
    const { data: lesson, error: lessonError } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', lessonId)
      .single();

    if (lessonError || !lesson) {
      console.error('Lesson not found:', lessonError);
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    // 2) Buscar módulo + lições do módulo (para prev/next)
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .eq('id', lesson.module_id)
      .single();

    if (moduleError || !module) {
      console.error('Module not found:', moduleError);
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 },
      );
    }

    // 3) Info do autor (nome) — opcional
    let authorName: string | null = null;
    if (lesson.author_id) {
      const { data: author, error: authorError } = await supabase
        .from('users')
        .select('username')
        .eq('id', lesson.author_id)
        .maybeSingle();

      if (!authorError && author) {
        authorName = author.username;
      }
    }

    // 4) Estatísticas globais da lição (quantas vezes concluída / XP distribuído)
    const { data: completions, error: completionsError } = await supabase
      .from('lesson_completions')
      .select('user_id, xp_earned')
      .eq('lesson_id', lessonId);

    if (completionsError) {
      console.error(
        'Error fetching lesson completions in /api/lessons/[id]:',
        completionsError,
      );
    }

    const completionRows = completions || [];
    const totalCompletions = completionRows.length;
    const totalXpDistributed = completionRows.reduce(
      (sum, row) => sum + (row.xp_earned || 0),
      0,
    );
    const uniqueReaders = new Set(
      completionRows.map((row) => row.user_id),
    ).size;

    // 5) Estado para o utilizador atual
    let isCreator = false;
    let isCompleted = false;

    if (user) {
      isCreator = lesson.author_id === user.id;

      if (!isCreator) {
        // Só consideramos "completed" se NÃO for o criador
        const { data: completion, error: completionError } = await supabase
          .from('lesson_completions')
          .select('id')
          .eq('user_id', user.id)
          .eq('lesson_id', lessonId)
          .maybeSingle();

        if (!completionError && completion) {
          isCompleted = true;
        }
      }
    }

    const enrichedLesson = {
      ...lesson,
      author_name: authorName,
      stats: {
        totalCompletions,
        totalXpDistributed,
        uniqueReaders,
      },
    };

    return NextResponse.json({
      success: true,
      lesson: enrichedLesson,
      module,
      isCompleted,
      isCreator,
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
