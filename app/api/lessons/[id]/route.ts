// app/api/lessons/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { splitReadMore } from '@/lib/read-more';

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

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing lesson id in route params' },
      { status: 400 },
    );
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');

    // 1) Procurar a lição dentro do curriculum dos cursos
    const { data: courses, error: coursesError } = await db
      .from('courses')
      .select('id, title, curriculum, author_id');

    if (coursesError) {
      console.error('Error fetching courses for lesson lookup:', coursesError);
      return NextResponse.json(
        { success: false, error: 'Failed to load lesson' },
        { status: 500 },
      );
    }

    let matchedCourse: any = null;
    let matchedTopic: any = null;
    let matchedLesson: any = null;

    (courses || []).some((course: any) => {
      const topics: any[] = Array.isArray(course.curriculum?.topics)
        ? course.curriculum!.topics
        : [];

      for (let topicIndex = 0; topicIndex < topics.length; topicIndex++) {
        const topic = topics[topicIndex];
        const topicId = topic?.id || `topic-${topicIndex + 1}`;
        const lessons = Array.isArray(topic?.lessons)
          ? topic.lessons
          : [];

        for (let lessonIndex = 0; lessonIndex < lessons.length; lessonIndex++) {
          const lesson = lessons[lessonIndex];
          if (lesson?.id === id) {
            matchedCourse = course;
            matchedTopic = {
              ...topic,
              id: topicId,
            };
            matchedLesson = {
              ...lesson,
              module_id: topicId,
              order:
                typeof lesson?.order === 'number'
                  ? lesson.order
                  : lessonIndex + 1,
            };
            return true;
          }
        }
      }
      return false;
    });

    if (!matchedCourse || !matchedLesson) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found' },
        { status: 404 },
      );
    }

    const moduleLessons = Array.isArray(matchedTopic?.lessons)
      ? matchedTopic.lessons.map((lesson: any, idx: number) => ({
          id: lesson?.id || `${matchedTopic.id}-lesson-${idx + 1}`,
          title: lesson?.title,
          order:
            typeof lesson?.order === 'number'
              ? lesson.order
              : idx + 1,
        }))
      : [];

    const authorIds = new Set<string>();
    if (matchedLesson.author_id) authorIds.add(matchedLesson.author_id);
    if (matchedTopic?.author_id) authorIds.add(matchedTopic.author_id);

    const authorMap: Record<string, string> = {};

    if (authorIds.size > 0) {
      const { data: authors, error: authorsError } = await db
        .from('users')
        .select('id, username')
        .in('id', Array.from(authorIds));

      if (authorsError) {
        console.error('Error fetching lesson/module authors:', authorsError);
      } else {
        (authors || []).forEach((author: any) => {
          authorMap[author.id] = author.username || 'User';
        });
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

    const completionsArray: CompletionRow[] =
      ((completions || []) as CompletionRow[]) || [];

    const completedCount = completionsArray.length;

    const totalXpDistributed = completionsArray.reduce(
      (sum: number, row: CompletionRow) => sum + (row.xp_earned ?? 0),
      0,
    );

    // 5) Flags: criador / completed (criador nunca conta como completed)
    const isCreator =
      !!userId &&
      !!matchedLesson.author_id &&
      matchedLesson.author_id === userId;

    const isCompleted =
      !!userId &&
      !isCreator &&
      completionsArray.some((c) => c.user_id && c.user_id === userId);

    // 6) Normalizar dados da lesson
    const authorName =
      (matchedLesson.author_id &&
        authorMap[matchedLesson.author_id]) ||
      null;

    const rawContent =
      typeof matchedLesson.content === 'string'
        ? matchedLesson.content
        : '';
    const { before: content_preview, hasReadMore: content_has_read_more } =
      splitReadMore(rawContent);

    const lesson = {
      id: matchedLesson.id,
      title: matchedLesson.title,
      description: matchedLesson.description,
      content: matchedLesson.content,
      content_preview,
      content_has_read_more,
      xp_reward: matchedLesson.xp_reward,
      estimated_time: matchedLesson.estimated_time,
      order: matchedLesson.order,
      module_id: matchedLesson.module_id,
      author_id: matchedLesson.author_id,
      author_name: authorName,
      created_at: matchedLesson.created_at,
    };

    // 7) Normalizar dados do módulo (ou fallback mínimo se falhar)
    const moduleAuthorName =
      (matchedTopic?.author_id &&
        authorMap[matchedTopic.author_id]) ||
      null;

    const lessonModule = {
      id: matchedTopic?.id,
      title: matchedTopic?.title,
      course_id: matchedCourse.id,
      author_id: matchedTopic?.author_id ?? matchedCourse.author_id ?? null,
      author_name: moduleAuthorName,
      lessons: moduleLessons,
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
