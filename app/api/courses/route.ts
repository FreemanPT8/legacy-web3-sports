import { NextRequest, NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

const db = supabaseAdmin ?? supabase;

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
          'Unknown';

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

    // 5) XP stats: completions de lições, módulos e cursos
    const lessonStatsById: Record<
      string,
      { completedCount: number; totalXp: number }
    > = {};
    const moduleBonusXpById: Record<string, number> = {};
    const courseBonusXpById: Record<string, number> = {};

    // 5.1) lesson_completions
    if (lessonsArray.length > 0) {
      const lessonIds = lessonsArray
        .map((l: any) => l.id)
        .filter((id: any) => !!id);

      const { data: lessonCompletions, error: lessonCompError } =
        await db
          .from('lesson_completions')
          .select('lesson_id, xp_earned')
          .in('lesson_id', lessonIds);

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

    // 5.2) module_completions
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

    // 5.3) course_completions
    if (courseIds.length > 0) {
      const { data: courseCompletions, error: courseCompError } =
        await db
          .from('course_completions')
          .select('course_id, xp_earned')
          .in('course_id', courseIds);

      if (courseCompError) {
        console.error(
          'Error fetching course completions:',
          courseCompError,
        );
      } else if (Array.isArray(courseCompletions)) {
        courseCompletions.forEach((row: any) => {
          const cid = row.course_id;
          if (!cid) return;
          if (!courseBonusXpById[cid]) {
            courseBonusXpById[cid] = 0;
          }
          courseBonusXpById[cid] += row.xp_earned || 0;
        });
      }
    }

    // 6) Lições por módulo (com stats)
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

      lessonsByModule[l.module_id].push({
        ...l,
        author_name:
          (l.author_id && authorMap[l.author_id]) || 'Unknown',
        completed_count: stats.completedCount,
        xp_distributed_total: stats.totalXp,
      });
    });

    // 7) Módulos por curso (com lições enriquecidas + XP distribuído no módulo)
    const modulesByCourse: Record<string, any[]> = {};
    modulesArray.forEach((m: any) => {
      const courseId = m.course_id;
      if (!courseId) return;

      if (!modulesByCourse[courseId]) {
        modulesByCourse[courseId] = [];
      }

      const moduleLessonsRaw = lessonsByModule[m.id] || [];
      const moduleLessons = moduleLessonsRaw
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        );

      const lessonXpDistributed = moduleLessons.reduce(
        (acc: number, l: any) =>
          acc + (l.xp_distributed_total || 0),
        0,
      );

      const moduleBonusXp = moduleBonusXpById[m.id] || 0;
      const moduleTotalXpDistributed =
        lessonXpDistributed + moduleBonusXp;

      modulesByCourse[courseId].push({
        ...m,
        author_name:
          (m.author_id && authorMap[m.author_id]) || 'Unknown',
        lessons: moduleLessons,
        xp_distributed_total: moduleTotalXpDistributed,
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

      const totalXP = courseModules.reduce((acc: number, m: any) => {
        if (!Array.isArray(m.lessons)) return acc;
        return (
          acc +
          m.lessons.reduce(
            (sum: number, l: any) =>
              sum + (l.xp_reward || 0),
            0,
          )
        );
      }, 0);

      const isCourseCreator =
        !!user &&
        ((c.author_id && c.author_id === user.id) ||
          (!c.author_id && isAdminUser));

      const authorName =
        (c.author_id && authorMap[c.author_id]) || 'Unknown';

      // XP já distribuído neste curso
      const lessonXpDistributed = courseModules.reduce(
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

      const moduleBonusTotal = courseModules.reduce(
        (acc: number, m: any) => acc + (moduleBonusXpById[m.id] || 0),
        0,
      );

      const courseBonusXp = courseBonusXpById[c.id] || 0;

      const totalXpDistributed =
        lessonXpDistributed + moduleBonusTotal + courseBonusXp;

      return {
        ...c,
        author_name: authorName,
        isCreator: isCourseCreator,
        modules: courseModules,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
        xp_distributed_total: totalXpDistributed,
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
