import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

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
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // 1) Buscar a lição
    const { data: rawLesson, error: lessonError } = await db
      .from('lessons')
      .select('*')
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

    // 2) Tentar buscar o módulo da lição
    let rawModule: any = null;
    let moduleError: any = null;

    const { data: moduleData, error: mError } = await db
      .from('modules')
      .select('id, title, course_id, author_id')
      .eq('id', rawLesson.module_id)
      .maybeSingle();

    if (mError) {
      moduleError = mError;
      console.error('Error fetching module (non-fatal):', mError);
    } else {
      rawModule = moduleData;
    }

    // 3) Buscar TODAS as lições do módulo (para prev/next) — se tivermos módulo
    let moduleLessons: any[] = [];
    if (rawModule?.id) {
      const { data: lessonsData, error: lessonsError } = await db
        .from('lessons')
        .select('id, title, order')
        .eq('module_id', rawModule.id);

      if (lessonsError) {
        console.error(
          'Error fetching module lessons (non-fatal):',
          lessonsError,
        );
      } else if (Array.isArray(lessonsData)) {
        moduleLessons = lessonsData;
      }
    }

    // 4) Buscar completions desta lição (para stats e isCompleted)
    const { data: completions, error: completionsError } = await db
      .from('lesson_completions')
      .select('user_id, xp_earned')
      .eq('lesson_id', id);

    if (completionsError) {
      console.error(
        'Error fetching lesson completions (non-fatal):',
        completionsError,
      );
    }

    const completionsArray: { user_id: string; xp_earned: number | null }[] =
      completions || [];

    const completedCount = completionsArray.length;

    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row: any) => sum + (row.xp_earned ?? 0),
      0,
    );

    // 5) Flags: criador / completed (criador nunca conta como completed)
    const isCreator =
      !!userId &&
      !!rawLesson.author_id &&
      rawLesson.author_id === userId;

    const isCompleted =
      !!userId &&
      !isCreator &&
      completionsArray.some((c) => c.user_id === userId);

    // 6) Objetos no formato esperado pelo frontend

    const lesson = {
      id: rawLesson.id,
      title: rawLesson.title,
      description: rawLesson.description,
      content: rawLesson.content,
      xp_reward: rawLesson.xp_reward,
      estimated_time: rawLesson.estimated_time,
      order: rawLesson.order,
      module_id: rawLesson.module_id,
      author_id: rawLesson.author_id,
      author_name: rawLesson.author_name || null,
      created_at: rawLesson.created_at,
    };

    // Se o módulo falhar, devolvemos um módulo "mínimo" para a UI não rebentar.
    const module = rawModule
      ? {
          id: rawModule.id,
          title: rawModule.title,
          course_id: rawModule.course_id,
          author_id: rawModule.author_id,
          lessons: Array.isArray(moduleLessons)
            ? moduleLessons.map((l: any) => ({
                id: l.id,
                title: l.title,
                order: l.order,
              }))
            : [],
        }
      : {
          id: rawLesson.module_id,
          title: { en: 'Module', pt: 'Módulo' },
          course_id: '',
          author_id: null,
          lessons: [],
        };

    const stats = {
      completedCount,
      totalXpDistributed,
    };

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
