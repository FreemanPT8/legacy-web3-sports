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

    // 2) Se não for preciso módulos, só normalizamos autores
    if (!includeModules) {
      // mapear author_ids
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
          console.error('Error fetching course authors:', authorsError);
        } else {
          authorMap = {};
          (authors || []).forEach((u: any) => {
            authorMap[u.id] = u.username || 'User';
          });
        }
      }

      const normalizedCourses = coursesArray.map((c: any) => {
        const authorName =
          (c.author_id && authorMap[c.author_id]) ||
          c.author ||
          'Admin';

        const isCourseCreator =
          !!user && !!c.author_id && c.author_id === user.id;

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
        authorMap = {};
        (authors || []).forEach((u: any) => {
          authorMap[u.id] = u.username || 'User';
        });
      }
    }

    // 5) Map de lições por módulo
    const lessonsByModule: Record<string, any[]> = {};
    lessonsArray.forEach((l: any) => {
      if (!l.module_id) return;
      if (!lessonsByModule[l.module_id]) {
        lessonsByModule[l.module_id] = [];
      }
      lessonsByModule[l.module_id].push(l);
    });

    // 6) Map de módulos por curso (com lições agregadas)
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

    // 7) Normalizar cursos + estatísticas
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

      const authorName =
        (c.author_id && authorMap[c.author_id]) ||
        c.author ||
        'Admin';

      const isCourseCreator =
        !!user && !!c.author_id && c.author_id === user.id;

      return {
        ...c,
        author_name: authorName,
        isCreator: isCourseCreator,
        modules: courseModules,
        total_modules: totalModules,
        total_lessons: totalLessons,
        total_xp: totalXP,
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
