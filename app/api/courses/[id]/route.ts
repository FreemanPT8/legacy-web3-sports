import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

type LessonCompletionRow = {
  lesson_id: string | null;
  user_id: string | null;
  xp_earned: number | null;
};

type ModuleCompletionRow = {
  module_id: string | null;
  user_id: string | null;
  xp_earned: number | null;
};

type CourseCompletionRow = {
  course_id: string | null;
  user_id: string | null;
  xp_earned: number | null;
};

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

    const lessonIds = lessonsArray
      .map((l: any) => l.id)
      .filter((lid: any) => !!lid);

    // 4) COMPLETIONS & STATS (lições / módulos / curso)
    let lessonCompletions: LessonCompletionRow[] = [];
    let moduleCompletions: ModuleCompletionRow[] = [];
    let courseCompletions: CourseCompletionRow[] = [];

    if (lessonIds.length > 0) {
      const { data, error } = await db
        .from('lesson_completions')
        .select('lesson_id, user_id, xp_earned')
        .in('lesson_id', lessonIds);

      if (error) {
        console.error(
          'Error fetching lesson completions:',
          error,
        );
      } else {
        lessonCompletions = (data || []) as LessonCompletionRow[];
      }
    }

    if (moduleIds.length > 0) {
      const { data, error } = await db
        .from('module_completions')
        .select('module_id, user_id, xp_earned')
        .in('module_id', moduleIds);

      if (error) {
        console.error(
          'Error fetching module completions:',
          error,
        );
      } else {
        moduleCompletions = (data || []) as ModuleCompletionRow[];
      }
    }

    {
      const { data, error } = await db
        .from('course_completions')
        .select('course_id, user_id, xp_earned')
        .eq('course_id', id);

      if (error) {
        console.error(
          'Error fetching course completions:',
          error,
        );
      } else {
        courseCompletions = (data || []) as CourseCompletionRow[];
      }
    }

    // 4.1) Maps de stats
    const lessonStatsMap: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    const moduleStatsMap: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    let courseStats = { completedCount: 0, totalXp: 0 };

    lessonCompletions.forEach((row) => {
      if (!row.lesson_id) return;
      const key = row.lesson_id;
      if (!lessonStatsMap[key]) {
        lessonStatsMap[key] = { completedCount: 0, totalXp: 0 };
      }
      lessonStatsMap[key].completedCount += 1;
      lessonStatsMap[key].totalXp += row.xp_earned ?? 0;
    });

    moduleCompletions.forEach((row) => {
      if (!row.module_id) return;
      const key = row.module_id;
      if (!moduleStatsMap[key]) {
        moduleStatsMap[key] = { completedCount: 0, totalXp: 0 };
      }
      moduleStatsMap[key].completedCount += 1;
      moduleStatsMap[key].totalXp += row.xp_earned ?? 0;
    });

    courseStats = courseCompletions.reduce(
      (acc, row) => {
        acc.completedCount += 1;
        acc.totalXp += row.xp_earned ?? 0;
        return acc;
      },
      { completedCount: 0, totalXp: 0 },
    );

    // 4.2) Sets de completions para ESTE user
    let userLessonCompletedSet = new Set<string>();
    let userModuleCompletedSet = new Set<string>();
    let userCourseCompleted = false;

    if (user) {
      userLessonCompletedSet = new Set(
        lessonCompletions
          .filter((r) => r.user_id === user.id)
          .map((r) => r.lesson_id as string),
      );

      userModuleCompletedSet = new Set(
        moduleCompletions
          .filter((r) => r.user_id === user.id)
          .map((r) => r.module_id as string),
      );

      userCourseCompleted = courseCompletions.some(
        (r) => r.user_id === user.id,
      );
    }

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
      const moduleStats = moduleStatsMap[m.id] || {
        completedCount: 0,
        totalXp: 0,
      };

      const moduleLessons = moduleLessonsRaw
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        )
        .map((l: any) => {
          const lessonAuthorName =
            (l.author_id && authorMap[l.author_id]) ||
            'Legacy Team';

          const lessonStats = lessonStatsMap[l.id] || {
            completedCount: 0,
            totalXp: 0,
          };

          const isLessonCreator =
            !!user &&
            ((l.author_id && l.author_id === user.id) ||
              (!l.author_id && isAdminUser));

          const isCompletedForUser =
            !!user &&
            !isLessonCreator &&
            userLessonCompletedSet.has(l.id);

          return {
            ...l,
            author_name: lessonAuthorName,
            isCreator: isLessonCreator,
            isCompleted: isCompletedForUser,
            completed_count: lessonStats.completedCount,
            total_xp_distributed: lessonStats.totalXp,
          };
        });

      const isModuleCreator =
        !!user &&
        ((m.author_id && m.author_id === user.id) ||
          (!m.author_id && isAdminUser));

      const moduleAuthorName =
        (m.author_id && authorMap[m.author_id]) ||
        'Legacy Team';

      const isModuleCompletedForUser =
        !!user &&
        !isModuleCreator &&
        userModuleCompletedSet.has(m.id);

      return {
        ...m,
        author_name: moduleAuthorName,
        isCreator: isModuleCreator,
        isCompleted: isModuleCompletedForUser,
        completed_count: moduleStats.completedCount,
        total_xp_distributed: moduleStats.totalXp,
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

    const totalXP = normalizedModules.reduce(
      (acc: number, m: any) => {
        if (!Array.isArray(m.lessons)) return acc;
        return (
          acc +
          m.lessons.reduce(
            (sum: number, l: any) => sum + (l.xp_reward || 0),
            0,
          )
        );
      },
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
      'Legacy Team';

    const course = {
      ...rawCourse,
      author_name: courseAuthorName,
      isCreator: isCourseCreator,
      isCompleted: !!user && !isCourseCreator && userCourseCompleted,
      modules: normalizedModules,
      total_modules: totalModules,
      total_lessons: totalLessons,
      total_xp: totalXP,
      completed_count: courseStats.completedCount,
      total_xp_distributed: courseStats.totalXp,
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
