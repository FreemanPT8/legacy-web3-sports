import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type LangCode = 'en' | 'pt' | 'es' | 'fr' | 'it' | 'de';

interface CoursePayload {
  title: Record<LangCode, string>;
  description: Record<LangCode, string>;
  level?: string;
  xp_threshold?: number;
  published?: boolean;
}

interface LessonPayload {
  order?: number;
  titles: Record<LangCode, string>;
  descriptions: Record<LangCode, string>;
  content: Record<string, string>; // HTML por língua
  xp_reward?: number;
  xp_threshold?: number;
  estimated_time?: number;
}

interface ModulePayload {
  order?: number;
  titles: Record<LangCode, string>;
  descriptions: Record<LangCode, string>;
  lessons: LessonPayload[];
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  if (!canManageCourses) {
    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to manage courses.',
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as {
      course?: CoursePayload;
      modules?: ModulePayload[];
    };

    const { course, modules } = body;

    if (!course || !course.title || !course.description) {
      return NextResponse.json(
        {
          success: false,
          error: 'Course title and description are required.',
        },
        { status: 400 },
      );
    }

    // 1) Criar curso
    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: course.title,
        description: course.description,
        level: course.level || 'beginner',
        xp_threshold: course.xp_threshold ?? 0,
        published: course.published ?? false,
        order: 0,
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Error creating course:', courseError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create course.',
        },
        { status: 500 },
      );
    }

    // 2) Criar módulos + lições
    if (modules && Array.isArray(modules) && modules.length > 0) {
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const module = modules[moduleIndex];

        const { data: newModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: module.titles,
            description: module.descriptions,
            order: module.order ?? moduleIndex + 1,
          })
          .select()
          .single();

        if (moduleError || !newModule) {
          console.error('Error creating module:', moduleError);
          // Continua com os restantes módulos/ lições, não faz rollback simples aqui
          continue;
        }

        if (module.lessons && Array.isArray(module.lessons) && module.lessons.length > 0) {
          const lessonsToInsert = module.lessons.map((lesson, lessonIndex) => ({
            module_id: newModule.id,
            title: lesson.titles,
            description: lesson.descriptions,
            content: lesson.content,
            xp_reward: lesson.xp_reward ?? 20,
            xp_threshold: lesson.xp_threshold ?? 0,
            order: lesson.order ?? lessonIndex + 1,
            estimated_time: lesson.estimated_time ?? 10,
          }));

          const { error: lessonsError } = await supabase
            .from('lessons')
            .insert(lessonsToInsert);

          if (lessonsError) {
            console.error('Error creating lessons:', lessonsError);
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      course: newCourse,
      message: 'Course created successfully',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/courses/create:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
