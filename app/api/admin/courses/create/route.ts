// app/api/admin/courses/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Só quem tem canManageCourses pode criar cursos
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
    const body = await request.json();
    const { course, modules } = body as {
      course?: {
        title?: Record<string, string>;
        description?: Record<string, string>;
        level?: string;
        xp_required?: number;
        published?: boolean;
      };
      modules?: Array<{
        id: string;
        title: string;
        description: string;
        order: number;
        lessons: Array<{
          id: string;
          title: string;
          description: string;
          content: string;
          duration_minutes: number;
          xp_reward: number;
          order: number;
        }>;
      }>;
    };

    if (!course || !course.title || !course.description) {
      return NextResponse.json(
        { success: false, error: 'Course title and description are required.' },
        { status: 400 },
      );
    }

    const xpRequired = course.xp_required ?? 0;
    const isPublished = !!course.published;

    // 1) Criar curso
    const { data: newCourse, error: courseError } = await supabaseAdmin
      .from('courses')
      .insert({
        title: course.title, // JSON multilíngue
        description: course.description, // JSON multilíngue
        level: course.level || 'beginner',
        xp_threshold: xpRequired,
        order: 0,
        published: isPublished,
        created_by: currentUser.userId,
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Error creating course:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to create course.' },
        { status: 500 },
      );
    }

    // 2) Criar módulos + lições (se existirem)
    if (modules && Array.isArray(modules) && modules.length > 0) {
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const module = modules[moduleIndex];

        const { data: newModule, error: moduleError } = await supabaseAdmin
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: { en: module.title || `Module ${moduleIndex + 1}` },
            description: { en: module.description || '' },
            order: module.order || moduleIndex + 1,
          })
          .select()
          .single();

        if (moduleError || !newModule) {
          console.error('Error creating module:', moduleError);
          // continua para os restantes módulos, mas não falha o curso
          continue;
        }

        if (
          module.lessons &&
          Array.isArray(module.lessons) &&
          module.lessons.length > 0
        ) {
          const lessonsToInsert = module.lessons.map(
            (lesson: any, lessonIndex: number) => ({
              module_id: newModule.id,
              title: { en: lesson.title || `Lesson ${lessonIndex + 1}` },
              description: { en: lesson.description || '' },
              content: { en: lesson.content || '' },
              xp_reward: lesson.xp_reward || 20,
              xp_threshold: 0,
              order: lesson.order || lessonIndex + 1,
              estimated_time: lesson.duration_minutes || 10,
            }),
          );

          const { error: lessonsError } = await supabaseAdmin
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
      message: 'Course created successfully.',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/courses:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error.' },
      { status: 500 },
    );
  }
}
