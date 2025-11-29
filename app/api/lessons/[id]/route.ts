import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

// Usamos o client admin quando existir (bypass RLS)
const db = supabaseAdmin ?? supabase;

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;
    const userId = user?.id ?? null;

    // 1) Buscar a lição + autor
    const { data: rawLesson, error: lessonError } = await db
      .from('lessons')
      .select(
        `
        id,
        title,
        description,
        content,
        xp_reward,
        estimated_time,
        order,
        module_id,
        author_id,
        created_at,
        author_user:users!lessons_author_id_fkey (
          username
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (lessonError) {
      console.error('Error fetching lesson:', lessonError);
      return NextResponse.json(
        { success: false, error: 'Failed to load lesson' },
        { status: 500 },
      );
    }

    if (!rawLesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    // 2) Buscar módulo + todas as lições do módulo (para prev/next)
    const { data: rawModule, error: moduleError } = await db
      .from('modules')
      .select(
        `
        id,
        title,
        course_id,
        author_id
      `,
      )
      .eq('id', rawLesson.module_id)
      .maybeSingle();

    if (moduleError) {
      console.error('Error fetching module:', moduleError);
      return NextResponse.json(
        { success: false, error: 'Failed to load module' },
        { status: 500 },
      );
    }

    if (!rawModule) {
      return NextResponse.json(
        { success: false, error: 'Module not found' },
        { status: 404 },
      );
    }

    const { data: moduleLessons, error: lessonsError } = await db
      .from('lessons')
      .select(
        `
        id,
        title,
        order
      `,
      )
      .eq('module_id', rawModule.id);

    if (lessonsError) {
      console.error(
        'Error fetching module lessons:',
        lessonsError,
      );
    }

    // 3) Buscar completions desta lição (para stats + isCompleted)
    const { data: completions, error: completionsError } = await db
      .from('lesson_completions')
      .select('user_id, xp_earned')
      .eq('lesson_id', id);

    if (completionsError) {
      console.error(
        'Error fetching lesson completions:',
        completionsError,
      );
    }

    const completionsArray: { user_id: string; xp_earned: number | null }[] =
      completions || [];

    const completedCount = completionsArray.length;

    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row) => sum + (row.xp_earned || 0),
      0,
    );

    // 4) Determinar se o utilizador atual é criador / leitor que já completou
    const isCreator =
      !!userId &&
      !!rawLesson.author_id &&
      rawLesson.author_id === userId;

    const isCompleted =
      !!userId &&
      !isCreator &&
      completionsArray.some((c) => c.user_id === userId);

    const lesson = {
      ...rawLesson,
      author_name:
        rawLesson.author_user?.username || 'Admin',
    };

    const module = {
      id: rawModule.id,
      title: rawModule.title,
      course_id: rawModule.course_id,
      author_id: rawModule.author_id,
      lessons: Array.isArray(moduleLessons)
        ? moduleLessons.map((l) => ({
            ...l,
            xp_reward: undefined,
            estimated_time: undefined,
            author_id: undefined,
            author_name: undefined,
          }))
        : [],
    };

    const stats =
      completionsArray.length > 0
        ? {
            completedCount,
            totalXpDistributed,
          }
        : { completedCount: 0, totalXpDistributed: 0 };

    return NextResponse.json({
      success: true,
      lesson,
      module,
      isCompleted,
      isCreator,
      stats,
    });
  } catch (error) {
    console.error('Error in GET /api/lessons/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
