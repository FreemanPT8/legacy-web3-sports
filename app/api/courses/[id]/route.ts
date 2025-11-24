import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { verifyAuth } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    const user = authHeader ? await verifyAuth(authHeader) : null;

    // 1) Buscar curso publicado com módulos e lições
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select(
        `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `
      )
      .eq('id', params.id)
      .eq('published', true)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 }
      );
    }

    // 2) Se não há user, devolvemos o curso como está (sem info de completions)
    if (!user) {
      return NextResponse.json({
        success: true,
        course,
      });
    }

    // 3) User autenticado → buscar lições concluídas
    const lessonIds: string[] = [];

    const modulesArray = Array.isArray(course.modules) ? course.modules : [];
    modulesArray.forEach((mod: any) => {
      const lessonsArray = Array.isArray(mod.lessons) ? mod.lessons : [];
      lessonsArray.forEach((lesson: any) => {
        if (lesson.id) {
          lessonIds.push(lesson.id);
        }
      });
    });

    if (lessonIds.length === 0) {
      return NextResponse.json({
        success: true,
        course,
      });
    }

    const { data: completions, error: completionsError } = await supabase
      .from('lesson_completions')
      .select('lesson_id')
      .eq('user_id', user.id)
      .in('lesson_id', lessonIds);

    if (completionsError) {
      console.error('Error fetching lesson completions:', completionsError);
      // Mesmo com erro, devolvemos o curso
      return NextResponse.json({
        success: true,
        course,
      });
    }

    const completedSet = new Set(
      (completions || []).map((c: any) => c.lesson_id)
    );

    // 4) Marcar lições como is_completed
    const enrichedModules = modulesArray.map((mod: any) => {
      const lessonsArray = Array.isArray(mod.lessons) ? mod.lessons : [];
      const enrichedLessons = lessonsArray.map((lesson: any) => ({
        ...lesson,
        is_completed: completedSet.has(lesson.id),
      }));

      return {
        ...mod,
        lessons: enrichedLessons,
      };
    });

    const enrichedCourse = {
      ...course,
      modules: enrichedModules,
    };

    return NextResponse.json({
      success: true,
      course: enrichedCourse,
    });
  } catch (error) {
    console.error('Error in GET /api/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 }
    );
  }
}
