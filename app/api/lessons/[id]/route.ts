import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

interface RouteContext {
  params: { id: string };
}

// Usamos o client admin quando existir (bypass RLS)
const db = supabaseAdmin ?? supabase;

type CompletionRow = {
  user_id: string | null;
  xp_earned: number | null;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // 1) Buscar a lição + autor
    const { data: rawLesson, error: lessonError } = await db
      .from('lessons')
      .select(
        `
        *,
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

    // 2) Tentar buscar o módulo da lição (não fatal se falhar)
    let rawModule: any = null;

    const { data: moduleData, error: moduleError } = await db
      .from('modules')
      .select(
        `
        id,
        title,
        course_id,
        author_id,
        author_user:users!modules_author_id_fkey (
          username
        )
      `,
      )
      .eq('id', rawLesson.module_id)
      .maybeSingle();

    if (moduleError) {
      console.error(
        'Error fetching module (non-fatal):',
        moduleError,
      );
    } else {
      rawModule = moduleData;
    }

    // 3) Buscar TODAS as lições do módulo (para prev/next), se o módulo existir
    let moduleLessons: any[] = [];
    if (rawModule?.id) {
      const { data: lessonsData, error: lessonsError } = await db
        .from('lessons')
        .select('id, title, "order"')
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

    // 4) Buscar completions desta lição em lesson_completions
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

    const completionsArray: CompletionRow[] = (completions ||
      []) as CompletionRow[];

    const completedCount = completionsArray.length;

    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row: CompletionRow) =>
        sum + (row.xp_earned ?? 0),
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
      completionsArray.some(
        (c) => c.user_id && c.user_id === userId,
      );

    // 6) Normalizar dados da lesson
    const authorName =
      rawLesson.author_user?.username || null;

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
      author_name: authorName,
      created_at: rawLesson.created_at,
    };

    // 7) Normalizar dados do módulo (ou fallback mínimo se falhar)
    const lessonModule = rawModule
      ? {
          id: rawModule.id,
          title: rawModule.title,
          course_id: rawModule.course_id,
          author_id: rawModule.author_id,
          author_name:
            rawModule.author_user?.username || null,
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
          author_name: null,
          lessons: [],
        };

    const stats = {
      completedCount,
      totalXpDistributed,
    };

    return NextResponse.json({
      success: true,
      lesson,
      module: lessonModule,
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
