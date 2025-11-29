import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

interface RouteContext {
  params: { id: string };
}

const db = supabaseAdmin ?? supabase;

type LessonStatsRow = {
  lesson_id: string;
  completed_count: number | null;
  total_xp: number | null;
};

type ModuleStatsRow = {
  module_id: string;
  completed_count: number | null;
  total_xp: number | null;
};

type CourseStatsRow = {
  course_id: string;
  completed_count: number | null;
  total_xp: number | null;
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

    // 4) STATS & COMPLETIONS PARA ESTE USER
    const lessonIds = lessonsArray
      .map((l: any) => l.id)
      .filter((lid: any) => !!lid);

    let lessonStatsMap: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    let moduleStatsMap: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    let courseStats: { completedCount: number; totalXp: number } = {
      completedCount: 0,
      totalXp: 0,
    };

    let userLessonCompletedSet = new Set<string>();
    let userModuleCompletedSet = new Set<string>();
    let userCourseCompleted = false;

    // LESSON STATS
    if (lessonIds.length > 0) {
      const { data: lessonStats, error: lessonStatsError } =
        await db
          .from('lesson_completions')
          .select(
            'lesson_id, count(*) as completed_count, sum(xp_earned) as total_xp',
          )
          .in('lesson_id', lessonIds)
          .group('lesson_id');

      if (lessonStatsError) {
        console.error(
          'Error fetching lesson stats:',
          lessonStatsError,
        );
      } else {
        (lessonStats || []).forEach((row: any) => {
          const lesson_id = row.lesson_id as string;
          const completed_count = Number(row.completed_count ?? 0);
          const total_xp = Number(row.total_xp ?? 0);
          lessonStatsMap[lesson_id] = {
            completedCount: completed_count,
            totalXp: total_xp,
          };
        });
      }

      if (user) {
        const { data: userLessonCompletions, error: ulcError } =
          await db
            .from('lesson_completions')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds);

        if (ulcError) {
          console.error(
            'Error fetching user lesson completions:',
            ulcError,
          );
        } else {
          userLessonCompletedSet = new Set(
            (userLessonCompletions || []).map(
              (r: any) => r.lesson_id as string,
            ),
          );
        }
      }
    }

    // MODULE STATS
    if (moduleIds.length > 0) {
      const { data: moduleStats, error: moduleStatsError } =
        await db
          .from('module_completions')
          .select(
            'module_id, count(*) as completed_count, sum(xp_earned) as total_xp',
          )
          .in('module_id', moduleIds)
          .group('module_id');

      if (moduleStatsError) {
        console.error(
          'Error fetching module stats:',
          moduleStatsError,
        );
      } else {
        (moduleStats || []).forEach((row: any) => {
          const module_id = row.module_id as string;
          const completed_count = Number(row.completed_count ?? 0);
          const total_xp = Number(row.total_xp ?? 0);
          moduleStatsMap[module_id] = {
            completedCount: completed_count,
            totalXp: total_xp,
          };
        });
      }

      if (user) {
        const {
          data: userModuleCompletions,
          error: umcError,
        } = await db
          .from('module_completions')
          .select('module_id')
          .eq('user_id', user.id)
          .in('module_id', moduleIds);

        if (umcError) {
          console.error(
            'Error fetching user module completions:',
            umcError,
          );
        } else {
          userModuleCompletedSet = new Set(
            (userModuleCompletions || []).map(
              (r: any) => r.module_id as string,
            ),
          );
        }
      }
    }

    // COURSE STATS
    {
      const { data: cStats, error: cStatsError } = await db
        .from('course_completions')
        .select(
          'course_id, count(*) as completed_count, sum(xp_earned) as total_xp',
        )
        .eq('course_id', id)
        .group('course_id');

      if (cStatsError) {
        console.error(
          'Error fetching course stats:',
          cStatsError,
        );
      } else if (cStats && cStats.length > 0) {
        const row = cStats[0] as any;
        courseStats = {
          completedCount: Number(row.completed_count ?? 0),
          totalXp: Number(row.total_xp ?? 0),
        };
      }

      if (user) {
        const { data: userCourseCompletions, error: uccError } =
          await db
            .from('course_completions')
            .select('id')
            .eq('user_id', user.id)
            .eq('course_id', id)
            .maybeSingle();

        if (uccError) {
          console.error(
            'Error fetching user course completion:',
            uccError,
          );
        } else {
          userCourseCompleted = !!userCourseCompletions;
        }
      }
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
