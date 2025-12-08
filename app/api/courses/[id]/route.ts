// app/api/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';
import { splitReadMore } from '@/lib/read-more';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

export async function GET(
  request: NextRequest,
  context: RouteContext,
) {
  const { id } = context.params;

  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;
    const isAdminUser =
      !!user &&
      (user.role === 'Super Admin' || user.role === 'Admin');

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

    // 2) Módulos
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

    // 3) Lições
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

    // 4) Completions (todas) para as lições deste curso
    const lessonIds = lessonsArray
      .map((l: any) => l.id)
      .filter((lid: any) => !!lid);

    let completionsAll: any[] = [];
    let completedSetForUser = new Set<string>();
    let userXpInCourse = 0;

    if (lessonIds.length > 0) {
      const { data: completions, error: compError } = await db
        .from('lesson_completions')
        .select('lesson_id, xp_earned, user_id')
        .in('lesson_id', lessonIds);

      if (compError) {
        console.error(
          'Error fetching lesson completions:',
          compError,
        );
      } else {
        completionsAll = completions || [];

        if (user) {
          const userCompletions = completionsAll.filter(
            (c: any) => c.user_id === user.id,
          );

          completedSetForUser = new Set(
            userCompletions.map((c: any) => c.lesson_id),
          );

          userXpInCourse = userCompletions.reduce(
            (sum: number, c: any) =>
              sum + (c.xp_earned ?? 0),
            0,
          );
        }
      }
    }

    // Mapa de XP distribuído por lição (para somar por módulo/curso)
    const xpByLesson: Record<string, number> = {};
    completionsAll.forEach((c: any) => {
      const lid = c.lesson_id;
      if (!lid) return;
      const xp = c.xp_earned ?? 0;
      xpByLesson[lid] = (xpByLesson[lid] || 0) + xp;
    });

    // 5) Map de autores
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
        (authors || []).forEach((u: any) => {
          authorMap[u.id] = u.username || 'User';
        });
      }
    }

    // 6) Lições por módulo (enriquecidas)
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
          const contentRaw =
            typeof l.content === 'string' ? l.content : '';
          const { before: content_preview, hasReadMore: content_has_read_more } =
            splitReadMore(contentRaw);
          const isLessonCreator =
            !!user &&
            ((l.author_id && l.author_id === user.id) ||
              (!l.author_id && isAdminUser));

          const isCompleted =
            !!user &&
            !isLessonCreator &&
            completedSetForUser.has(l.id);

          const lessonAuthorName =
            (l.author_id && authorMap[l.author_id]) ||
            l.author ||
            (isLessonCreator && user
              ? user.username
              : 'Admin');

          return {
            ...l,
            author_name: lessonAuthorName,
            isCompleted,
            isCreator: isLessonCreator,
            content_preview,
            content_has_read_more,
          };
        });

      const isModuleCreator =
        !!user &&
        ((m.author_id && m.author_id === user.id) ||
          (!m.author_id && isAdminUser));

      const moduleAuthorName =
        (m.author_id && authorMap[m.author_id]) ||
        m.author ||
        (isModuleCreator && user
          ? user.username
          : 'Admin');

      // XP disponível no módulo (soma dos xp_reward das lições)
      const moduleXpAvailable = moduleLessons.reduce(
        (sum: number, l: any) =>
          sum + (l.xp_reward || 0),
        0,
      );

      // XP distribuído no módulo (soma do xpByLesson das lições)
      const moduleXpDistributed = moduleLessons.reduce(
        (sum: number, l: any) =>
          sum + (xpByLesson[l.id] || 0),
        0,
      );

      // Módulo completed para este user (todas as lições completed)
      const isModuleCompleted =
        !!user &&
        moduleLessons.length > 0 &&
        moduleLessons.every((l: any) => l.isCompleted);

      return {
        ...m,
        author_name: moduleAuthorName,
        isCreator: isModuleCreator,
        lessons: moduleLessons,
        xp_available: moduleXpAvailable,
        xp_distributed: moduleXpDistributed,
        isCompleted: isModuleCompleted,
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

    const totalXP = normalizedModules.reduce(
      (acc: number, m: any) => {
        if (!Array.isArray(m.lessons)) return acc;
        return (
          acc +
          m.lessons.reduce(
            (sum: number, l: any) =>
              sum + (l.xp_reward || 0),
            0,
          )
        );
      },
      0,
    );

    const courseXpDistributed = normalizedModules.reduce(
      (acc: number, m: any) =>
        acc + (m.xp_distributed || 0),
      0,
    );

    const isCourseCreator =
      !!user &&
      ((rawCourse.author_id &&
        rawCourse.author_id === user.id) ||
        (!rawCourse.author_id && isAdminUser));

    const courseAuthorName =
      (rawCourse.author_id &&
        authorMap[rawCourse.author_id]) ||
      rawCourse.author ||
      (isCourseCreator && user ? user.username : 'Admin');

    const course = {
      ...rawCourse,
      author_name: courseAuthorName,
      isCreator: isCourseCreator,
      modules: normalizedModules,
      total_modules: totalModules,
      total_lessons: totalLessons,
      total_xp: totalXP,
      xp_distributed: courseXpDistributed,
      xp_earned_by_user: userXpInCourse,
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
