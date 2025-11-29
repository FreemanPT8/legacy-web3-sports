import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Curso + autor
    const { data: rawCourse, error: courseError } = await db
      .from('courses')
      .select(
        `
        *,
        author_user:users!courses_author_id_fkey (
          username
        )
      `,
      )
      .eq('id', id)
      .maybeSingle();

    if (courseError) {
      console.error('Error fetching course:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to load course' },
        { status: 500 },
      );
    }

    if (!rawCourse) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 },
      );
    }

    // 2) Módulos + lições + autores
    const { data: rawModules, error: modulesError } = await db
      .from('modules')
      .select(
        `
        *,
        author_user:users!modules_author_id_fkey (
          username
        ),
        lessons:lessons (
          *,
          author_user:users!lessons_author_id_fkey (
            username
          )
        )
      `,
      )
      .eq('course_id', id)
      .order('order', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { success: false, error: 'Failed to load modules' },
        { status: 500 },
      );
    }

    const modulesArray = rawModules || [];

    // 3) Buscar completions para este user (se existir)
    let completedSet = new Set<string>();

    if (user && modulesArray.length > 0) {
      const allLessonIds: string[] = [];

      modulesArray.forEach((m: any) => {
        const lessons = Array.isArray(m.lessons) ? m.lessons : [];
        lessons.forEach((l: any) => {
          if (l?.id) allLessonIds.push(l.id);
        });
      });

      if (allLessonIds.length > 0) {
        const { data: completions, error: compError } = await db
          .from('lesson_completions')
          .select('lesson_id')
          .eq('user_id', user.id)
          .in('lesson_id', allLessonIds);

        if (compError) {
          console.error('Error fetching lesson completions:', compError);
        } else {
          completedSet = new Set(
            (completions || []).map((c: any) => c.lesson_id),
          );
        }
      }
    }

    // 4) Normalizar módulos & lições
    const normalizedModules = modulesArray.map((m: any) => {
      const lessons = Array.isArray(m.lessons) ? m.lessons : [];

      const moduleAuthorName =
        m.author_user?.username || m.author || 'Admin';

      const normalizedLessons = lessons
        .slice()
        .sort(
          (a: any, b: any) =>
            (a.order || 0) - (b.order || 0),
        )
        .map((l: any) => {
          const lessonAuthorName =
            l.author_user?.username || l.author || 'Admin';

          const lessonAuthorId = l.author_id as string | null;

          const isLessonCreator =
            !!user && !!lessonAuthorId && lessonAuthorId === user.id;

          const isCompleted =
            !!user &&
            !isLessonCreator &&
            completedSet.has(l.id);

          return {
            ...l,
            author_name: lessonAuthorName,
            isCompleted,
          };
        });

      return {
        ...m,
        author_name: moduleAuthorName,
        lessons: normalizedLessons,
      };
    });

    // 5) Stats do curso
    const totalModules = normalizedModules.length;

    const totalLessons = normalizedModules.reduce(
      (acc: number, m: any) =>
        acc +
        (Array.isArray(m.lessons) ? m.lessons.length : 0),
      0,
    );

    const totalXP = normalizedModules.reduce((acc: number, m: any) => {
      if (!Array.isArray(m.lessons)) return acc;
      return (
        acc +
        m.lessons.reduce(
          (sum: number, l: any) => sum + (l.xp_reward || 0),
          0,
        )
      );
    }, 0);

    const courseAuthorName =
      rawCourse.author_user?.username ||
      rawCourse.author ||
      'Admin';

    const isCourseCreator =
      !!user &&
      !!rawCourse.author_id &&
      rawCourse.author_id === user.id;

    const course = {
      ...rawCourse,
      author_name: courseAuthorName,
      isCreator: isCourseCreator,
      modules: normalizedModules,
      total_modules: totalModules,
      total_lessons: totalLessons,
      total_xp: totalXP,
    };

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    console.error('Error in GET /api/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
