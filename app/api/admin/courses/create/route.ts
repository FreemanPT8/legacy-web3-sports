import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  try {
    const body = await request.json();
    const { course, modules } = body;

    if (!course || !course.title || !course.description) {
      return NextResponse.json(
        { success: false, error: 'Course title and description are required' },
        { status: 400 }
      );
    }

    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: course.title,
        description: course.description,
        xp_threshold: course.xp_required || 0,
        order: 0,
        published: course.published || false,
      })
      .select()
      .single();

    if (courseError) {
      console.error('Error creating course:', courseError);
      return NextResponse.json(
        { success: false, error: 'Failed to create course' },
        { status: 500 }
      );
    }

    if (modules && Array.isArray(modules) && modules.length > 0) {
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const module = modules[moduleIndex];

        const { data: newModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: { en: module.title || `Module ${moduleIndex + 1}` },
            description: { en: module.description || '' },
            order: module.order || moduleIndex + 1,
          })
          .select()
          .single();

        if (moduleError) {
          console.error('Error creating module:', moduleError);
          continue;
        }

        if (module.lessons && Array.isArray(module.lessons) && module.lessons.length > 0) {
          const lessonsToInsert = module.lessons.map((lesson: any, lessonIndex: number) => ({
            module_id: newModule.id,
            title: { en: lesson.title || `Lesson ${lessonIndex + 1}` },
            content: { en: lesson.content || '' },
            xp_reward: lesson.xp_reward || 20,
            xp_threshold: 0,
            order: lesson.order || lessonIndex + 1,
            estimated_time: lesson.duration_minutes || 10,
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
      message: 'Course created successfully'
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
