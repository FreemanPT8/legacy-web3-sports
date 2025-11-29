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

    // 1) Curso
    const { data: rawCourse, error: courseError } = await db
      .from('courses')
      .select('*')
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

    // 2) Módulos do curso
    const { data: rawModules, error: modulesError } = await db
      .from('modules')
      .select('*')
      .eq('course_id', id)
      .order('order', { ascending: true });

    if (modulesError) {
      console.error('Error fetching modules:', modulesError);
      return NextResponse.json(
        { success: false, error: 'Failed to load modules' },
        { status: 500 },
      );
    }

    const modulesArray: any[] = rawModules || [];

    // 3) Lições dos módulos
    let lessonsArray: any[] = [];
    const moduleIds = modulesArray
      .map((m: any) => m.id)
      .filter((mid: any) => !!mid);

    if (moduleIds.length > 0) {
      const { data: rawLessons, error: lessonsError } = await db
        .from('lessons')
        .select('*')
        .in('module_id', moduleIds);

      if (lessonsError) {
        console.error('Error fetching lessons:', lessonsError);
        return NextResponse.json(
          { success: false, error: 'Failed to load lessons' },
          { status: 500 },
        );
      }

      lessonsArray = rawLessons || [];
    }

    // 4) Completions deste user (para badges Completed)
    let completedSet = new Set<string>();

    if (user && lessonsArray.length > 0) {
      const lessonIds = lessonsArray
        .map((l: any) => l.id)
        .filter((lid: any) => !!lid);

      if (lessonIds.length > 0) {
        const { data: completions, error: compError } = await db
          .from('lesson_completions')
          .select('lesson_id')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds);

        if (compError) {
          console.error('Error fetching lesson completions:', compError);
        } else {
          completedSet = new Set(
            (completions || []).map((c: any) => c.lesson_id),
          );
        }
      }
    }

    // 5) Map de autores (curso + módulos + lições)
    const authorIdsSet = new Set<string>();

    if (rawCourse.author_id) authorIdsSet.add(rawCourse.author_id);
    modulesArray.forEach((m: any) => {
      if (m.author_id) authorIdsSet.add(m.author_id);
    });
    lessonsArray.forEach((l: any) => {
      if (l.author_id) authorIdsSet.add(l.author_id);
    });

    let authorMap: Record<string, string> = {};
    const allAuthorIds = Array.from(authorIdsSet);

    if (allAuthorIds.length > 0) {
      const { data: authors, error: authorsError } = await db
        .from('users')
        .select('id, username')
        .in('id', allAuthorIds);

      if (authorsError) {
        console.error('Error fetching authors:', authorsError);
      } else {
        authorMap = {};
        (authors || []).forEach((u: any) => {
          authorMap[u.id] = u.username || 'User';
        });
      }
    }

    // 6) Lições agrupadas por módulo + enriched
    const lessonsByModule: Record<string, any[]> = {};
    lessonsArray.forEach((l: any) => {
      if (!l.module_id) return;
      if (!lessonsByModule[l.module_id]) {
        lessonsByModule[l.module_id] = [];
      }
      lessonsByModule[l.module_id].push(l);
    });

    const normalizedModules = modulesArray.map((m: any) => {
      const moduleLessonsRaw = lessonsByModule[m.id] || [];

      const moduleLessons = moduleLessonsRaw
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        )
        .map((l: any) => {
          const lessonAuthorName =
            (l.author_id && authorMap[l.author_id]) ||
            l.author ||
            'Admin';

          const isLessonCreator =
            !!user &&
            !!l.author_id &&
            l.author_id === user.id;

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

      const moduleAuthorName =
        (m.author_id && authorMap[m.author_id]) ||
        m.author ||
        'Admin';

      return {
        ...m,
        author_name: moduleAuthorName,
        lessons: moduleLessons,
      };
    });

    // 7) Estatísticas do curso
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
      (rawCourse.author_id &&
        authorMap[rawCourse.author_id]) ||
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
