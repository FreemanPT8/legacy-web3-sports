import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

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

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const includeModules =
      url.searchParams.get('includeModules') === 'true';

    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;
    const isAdminUser =
      !!user &&
      (user.role === 'Super Admin' || user.role === 'Admin');

    // 1) Cursos publicados
    const { data: rawCourses, error: courseError } = await db
      .from('courses')
      .select('*')
      .eq('published', true)
      .order('order', { ascending: true });

    if (courseError) {
      console.error('Error fetching courses:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to load courses' },
        { status: 500 },
      );
    }

    if (!rawCourses || rawCourses.length === 0) {
      return NextResponse.json({
        success: true,
        courses: [],
      });
    }

    const coursesArray: any[] = rawCourses;

    // 2) Sem módulos → só normalizamos autor e isCreator
    if (!includeModules) {
      const courseAuthorIds = coursesArray
        .map((c: any) => c.author_id)
        .filter((id: any) => !!id);

      let authorMap: Record<string, string> = {};

      if (courseAuthorIds.length > 0) {
        const { data: authors, error: authorsError } = await db
          .from('users')
          .select('id, username')
          .in('id', courseAuthorIds);

        if (authorsError) {
          console.error(
            'Error fetching course authors:',
            authorsError,
          );
        } else {
          (authors || []).forEach((u: any) => {
            authorMap[u.id] = u.username || 'User';
          });
        }
      }

      const normalizedCourses = coursesArray.map((c: any) => {
        const isCourseCreator =
          !!user &&
          ((c.author_id && c.author_id === user.id) ||
            (!c.author_id && isAdminUser));

        const authorName =
          (c.author_id && authorMap[c.author_id]) ||
          'Legacy Team';

        return {
          ...c,
          author_name: authorName,
          isCreator: isCourseCreator,
        };
      });

      return NextResponse.json({
        success: true,
        courses: normalizedCourses,
      });
    }

    // 3) includeModules = true → carregar módulos + lições
    const courseIds = coursesArray
      .map((c: any) => c.id)
      .filter((id: any) => !!id);

    let modulesArray: any[] = [];
    let lessonsArray: any[] = [];

    if (courseIds.length > 0) {
      const { data: rawModules, error: modulesError } = await db
        .from('modules')
        .select('*')
        .in('course_id', courseIds)
        .order('order', { ascending: true });

      if (modulesError) {
        console.error('Error fetching modules:', modulesError);
        return NextResponse.json(
          { success: false, error: 'Failed to load modules' },
          { status: 500 },
        );
      }

      modulesArray = rawModules || [];

      const moduleIds = modulesArray
        .map((m: any) => m.id)
        .filter((id: any) => !!id);

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
    }

    // 4) Map de autores (curso + módulos + lições)
    const authorIdsSet = new Set<string>();

    coursesArray.forEach((c: any) => {
      if (c.author_id) authorIdsSet.add(c.author_id);
    });
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

    // 5) STATS: lesson_completions / module_completions / course_completions
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
    let courseStatsMap: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};

    let userLessonCompletedSet = new Set<string>();
    let userModuleCompletedSet = new Set<string>();
    let userCourseCompletedSet = new Set<string>();

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
    const moduleIds = modulesArray
      .map((m: any) => m.id)
      .filter((mid: any) => !!mid);

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
    if (courseIds.length > 0) {
      const { data: courseStats, error: courseStatsError } =
        await db
          .from('course_completions')
          .select(
            'course_id, count(*) as completed_count, sum(xp_earned) as total_xp',
          )
          .in('course_id', courseIds)
          .group('course_id');

      if (courseStatsError) {
        console.error(
          'Error fetching course stats:',
          courseStatsError,
        );
      } else {
        (courseStats || []).forEach((row: any) => {
          const course_id = row.course_id as string;
          const completed_count = Number(row.completed_count ?? 0);
          const total_xp = Number(row.total_xp ?? 0);
          courseStatsMap[course_id] = {
            completedCount: completed_count,
            totalXp: total_xp,
          };
        });
      }

      if (user) {
        const {
          data: userCourseCompletions,
          error: uccError,
        } = await db
          .from('course_completions')
          .select('course_id')
          .eq('user_id', user.id)
          .in('course_id', courseIds);

        if (uccError) {
          console.error(
            'Error fetching user course completions:',
            uccError,
          );
        } else {
          userCourseCompletedSet = new Set(
            (userCourseCompletions || []).map(
              (r: any) => r.course_id as string,
            ),
          );
        }
      }
    }

    // 6) Lições por módulo
    const lessonsByModule: Record<string, any[]> = {};
    lessonsArray.forEach((l: any) => {
      if (!l.module_id) return;
      if (!lessonsByModule[l.module_id]) {
        lessonsByModule[l.module_id] = [];
      }
      lessonsByModule[l.module_id].push(l);
    });

    // 7) Módulos por curso (com lições enriquecidas)
    const modulesByCourse: Record<string, any[]> = {};
    modulesArray.forEach((m: any) => {
      const courseId = m.course_id;
      if (!courseId) return;

      if (!modulesByCourse[courseId]) {
        modulesByCourse[courseId] = [];
      }

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

          const isLessonCompletedForUser =
            !!user &&
            !isLessonCreator &&
            userLessonCompletedSet.has(l.id);

          return {
            ...l,
            author_name: lessonAuthorName,
            isCreator: isLessonCreator,
            isCompleted: isLessonCompletedForUser,
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

      modulesByCourse[courseId].push({
        ...m,
        author_name: moduleAuthorName,
        isCreator: isModuleCreator,
        isCompleted: isModuleCompletedForUser,
        completed_count: moduleStats.completedCount,
        total_xp_distributed: moduleStats.totalXp,
        lessons: moduleLessons,
      });
    });

    // 8) Normalizar cursos com estatísticas
    const normalizedCourses = coursesArray.map((c: any) => {
      const courseModules = (modulesByCourse[c.id] || [])
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        );

      const totalModules = courseModules.length;

      const totalLessons = courseModules.reduce(
        (acc: number, m: any) =>
          acc +
          (Array.isArray(m.lessons) ? m.lessons.length : 0),
        0,
      );

      const totalXP = courseModules.reduce(
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

      const isCourseCreator =
        !!user &&
        ((c.author_id && c.author_id === user.id) ||
          (!c.author_id && isAdminUser));

      const courseAuthorName =
        (c.author_id && authorMap[c.author_id]) ||
        'Legacy Team';

      const courseStats = courseStatsMap[c.id] || {
        completedCount: 0,
        totalXp: 0,
      };

      const isCourseCompletedForUser =
        !!user &&
        !isCourseCreator &&
        userCourseCompletedSet.has(c.id);

      return {
        ...c,
        author_name: courseAuthorName,
        isCreator: isCourseCreator,
        isCompleted: isCourseCompletedForUser,
        modules: courseModules,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
        completed_count: courseStats.completedCount,
        total_xp_distributed: courseStats.totalXp,
      };
    });

    return NextResponse.json({
      success: true,
      courses: normalizedCourses,
    });
  } catch (error) {
    console.error('Error in GET /api/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
