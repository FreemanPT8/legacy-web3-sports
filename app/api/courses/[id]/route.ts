import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

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

    // 4) Completions de lições para este user (para badges Completed)
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
          console.error(
            'Error fetching lesson completions:',
            compError,
          );
        } else {
          completedSet = new Set(
            (completions || []).map((c: any) => c.lesson_id),
          );
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

    // 6) XP stats do lado das completions
    const lessonStatsById: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    const moduleBonusXpById: Record<string, number> = {};
    let courseBonusXp = 0;

    // 6.1) lesson_completions
    if (lessonsArray.length > 0) {
      const lessonIdsAll = lessonsArray
        .map((l: any) => l.id)
        .filter((id: any) => !!id);

      const { data: lessonCompletions, error: lessonCompError } =
        await db
          .from('lesson_completions')
          .select('lesson_id, xp_earned')
          .in('lesson_id', lessonIdsAll);

      if (lessonCompError) {
        console.error(
          'Error fetching lesson completions:',
          lessonCompError,
        );
      } else if (Array.isArray(lessonCompletions)) {
        lessonCompletions.forEach((row: any) => {
          const lid = row.lesson_id;
          if (!lid) return;
          if (!lessonStatsById[lid]) {
            lessonStatsById[lid] = {
              completedCount: 0,
              totalXp: 0,
            };
          }
          lessonStatsById[lid].completedCount += 1;
          lessonStatsById[lid].totalXp += row.xp_earned || 0;
        });
      }
    }

    // 6.2) module_completions
    if (modulesArray.length > 0) {
      const moduleIdsAll = modulesArray
        .map((m: any) => m.id)
        .filter((id: any) => !!id);

      const { data: moduleCompletions, error: moduleCompError } =
        await db
          .from('module_completions')
          .select('module_id, xp_earned')
          .in('module_id', moduleIdsAll);

      if (moduleCompError) {
        console.error(
          'Error fetching module completions:',
          moduleCompError,
        );
      } else if (Array.isArray(moduleCompletions)) {
        moduleCompletions.forEach((row: any) => {
          const mid = row.module_id;
          if (!mid) return;
          if (!moduleBonusXpById[mid]) {
            moduleBonusXpById[mid] = 0;
          }
          moduleBonusXpById[mid] += row.xp_earned || 0;
        });
      }
    }

    // 6.3) course_completions
    {
      const { data: courseCompletions, error: courseCompError } =
        await db
          .from('course_completions')
          .select('xp_earned')
          .eq('course_id', id);

      if (courseCompError) {
        console.error(
          'Error fetching course completions:',
          courseCompError,
        );
      } else if (Array.isArray(courseCompletions)) {
        courseBonusXp = courseCompletions.reduce(
          (acc: number, row: any) => acc + (row.xp_earned || 0),
          0,
        );
      }
    }

    // 7) Lições por módulo (enriquecidas)
    const lessonsByModule: Record<string, any[]> = {};
    lessonsArray.forEach((l: any) => {
      if (!l.module_id) return;
      if (!lessonsByModule[l.module_id]) {
        lessonsByModule[l.module_id] = [];
      }

      const stats = lessonStatsById[l.id] || {
        completedCount: 0,
        totalXp: 0,
      };

      const isLessonCreator =
        !!user &&
        ((l.author_id && l.author_id === user.id) ||
          (!l.author_id && isAdminUser));

      const isCompleted =
        !!user &&
        !isLessonCreator &&
        completedSet.has(l.id);

      const lessonAuthorName =
        (l.author_id && authorMap[l.author_id]) || 'Unknown';

      lessonsByModule[l.module_id].push({
        ...l,
        author_name: lessonAuthorName,
        isCompleted,
        isCreator: isLessonCreator,
        completed_count: stats.completedCount,
        xp_distributed_total: stats.totalXp,
      });
    });

    // 8) Módulos normalizados
    const normalizedModules = modulesArray.map((m: any) => {
      const moduleLessonsRaw = lessonsByModule[m.id] || [];

      const moduleLessons = moduleLessonsRaw
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        );

      const isModuleCreator =
        !!user &&
        ((m.author_id && m.author_id === user.id) ||
          (!m.author_id && isAdminUser));

      const moduleAuthorName =
        (m.author_id && authorMap[m.author_id]) || 'Unknown';

      const lessonXpDistributed = moduleLessons.reduce(
        (acc: number, l: any) =>
          acc + (l.xp_distributed_total || 0),
        0,
      );

      const moduleBonusXp = moduleBonusXpById[m.id] || 0;
      const moduleTotalXpDistributed =
        lessonXpDistributed + moduleBonusXp;

      return {
        ...m,
        author_name: moduleAuthorName,
        isCreator: isModuleCreator,
        lessons: moduleLessons,
        xp_distributed_total: moduleTotalXpDistributed,
      };
    });

    // 9) Estatísticas do curso
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

    const isCourseCreator =
      !!user &&
      ((rawCourse.author_id &&
        rawCourse.author_id === user.id) ||
        (!rawCourse.author_id && isAdminUser));

    const courseAuthorName =
      (rawCourse.author_id &&
        authorMap[rawCourse.author_id]) || 'Unknown';

    const lessonXpDistributed = normalizedModules.reduce(
      (acc: number, m: any) =>
        acc +
        (Array.isArray(m.lessons)
          ? m.lessons.reduce(
              (accL: number, l: any) =>
                accL + (l.xp_distributed_total || 0),
              0,
            )
          : 0),
      0,
    );

    const moduleBonusTotal = normalizedModules.reduce(
      (acc: number, m: any) =>
        acc + (moduleBonusXpById[m.id] || 0),
      0,
    );

    const totalXpDistributed =
      lessonXpDistributed + moduleBonusTotal + courseBonusXp;

    const course = {
      ...rawCourse,
      author_name: courseAuthorName,
      isCreator: isCourseCreator,
      modules: normalizedModules,
      total_modules: totalModules,
      total_lessons: totalLessons,
      total_xp: totalXP,
      xp_distributed_total: totalXpDistributed,
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
