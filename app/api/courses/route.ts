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

    // Se não queremos módulos → só normalizamos autor e isCreator
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
          c.author ||
          (isCourseCreator ? user!.username : 'Admin');

        return {
          ...c,
          author_name: authorName,
          isCreator: isCourseCreator,
          // nesta rota simples não calculamos XP distribuído
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

    // 5) Map auxiliares para cálculo de XP distribuído
    const moduleById: Record<string, any> = {};
    modulesArray.forEach((m: any) => {
      if (m.id) moduleById[m.id] = m;
    });

    const lessonById: Record<string, any> = {};
    lessonsArray.forEach((l: any) => {
      if (l.id) lessonById[l.id] = l;
    });

    const moduleIdsAll = modulesArray
      .map((m: any) => m.id)
      .filter((id: any) => !!id);

    const lessonIdsAll = lessonsArray
      .map((l: any) => l.id)
      .filter((id: any) => !!id);

    const xpDistributedByCourse: Record<string, number> = {};

    // 5.1) XP distribuído em lições (lesson_completions)
    if (lessonIdsAll.length > 0) {
      const { data: lessonCompletions, error: lessonCompError } =
        await db
          .from('lesson_completions')
          .select('lesson_id, xp_earned')
          .in('lesson_id', lessonIdsAll);

      if (lessonCompError) {
        console.error(
          'Error fetching lesson_completions:',
          lessonCompError,
        );
      } else {
        (lessonCompletions || []).forEach((row: any) => {
          const lesson = lessonById[row.lesson_id];
          if (!lesson) return;
          const module = moduleById[lesson.module_id];
          if (!module || !module.course_id) return;

          const courseId = module.course_id as string;
          const xp = row.xp_earned || 0;
          xpDistributedByCourse[courseId] =
            (xpDistributedByCourse[courseId] || 0) + xp;
        });
      }
    }

    // 5.2) XP distribuído em módulos (module_completions)
    if (moduleIdsAll.length > 0) {
      const { data: moduleCompletions, error: moduleCompError } =
        await db
          .from('module_completions')
          .select('module_id, xp_earned')
          .in('module_id', moduleIdsAll);

      if (moduleCompError) {
        console.error(
          'Error fetching module_completions:',
          moduleCompError,
        );
      } else {
        (moduleCompletions || []).forEach((row: any) => {
          const module = moduleById[row.module_id];
          if (!module || !module.course_id) return;

          const courseId = module.course_id as string;
          const xp = row.xp_earned || 0;
          xpDistributedByCourse[courseId] =
            (xpDistributedByCourse[courseId] || 0) + xp;
        });
      }
    }

    // 5.3) XP distribuído em cursos (course_completions)
    if (courseIds.length > 0) {
      const { data: courseCompletions, error: courseCompError } =
        await db
          .from('course_completions')
          .select('course_id, xp_earned')
          .in('course_id', courseIds);

      if (courseCompError) {
        console.error(
          'Error fetching course_completions:',
          courseCompError,
        );
      } else {
        (courseCompletions || []).forEach((row: any) => {
          const courseId = row.course_id as string;
          if (!courseId) return;
          const xp = row.xp_earned || 0;
          xpDistributedByCourse[courseId] =
            (xpDistributedByCourse[courseId] || 0) + xp;
        });
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
      const moduleLessons = moduleLessonsRaw
        .slice()
        .sort(
          (a: any, b: any) => (a.order || 0) - (b.order || 0),
        )
        .map((l: any) => ({
          ...l,
          author_name:
            (l.author_id && authorMap[l.author_id]) ||
            l.author ||
            'Admin',
        }));

      modulesByCourse[courseId].push({
        ...m,
        author_name:
          (m.author_id && authorMap[m.author_id]) ||
          m.author ||
          'Admin',
        lessons: moduleLessons,
      });
    });

    // 8) Normalizar cursos com estatísticas
    const normalizedCourses = coursesArray.map((c: any) => {
      const courseModules = (modulesByCourse[c.id] || []).slice().sort(
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
        (c.author_id && authorMap[c.author_id]) ||
        c.author ||
        (isCourseCreator ? user!.username : 'Admin');

      const xpDistributed =
        xpDistributedByCourse[c.id] ?? 0;

      return {
        ...c,
        author_name: authorName,
        isCreator: isCourseCreator,
        modules: courseModules,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
        xp_distributed_total: xpDistributed,
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
