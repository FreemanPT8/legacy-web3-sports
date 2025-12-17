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
  xp_reward?: number;
  published?: boolean;
  image_url?: string | null;
  is_completed?: boolean;
  is_paid?: boolean;
  overview?: string;
  key_takeaways?: string[];
  target_audience?: string[];
  duration_minutes?: number;
  bonuses?: string[];
  special_requirements?: string[];
  attachments?: any[];
  seo?: any;
  google_integrations?: any;
  curriculum?: any;
  schedule?: {
    publishAt?: string | null;
    expireAt?: string | null;
  };
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

    const hasAnyTitle = Object.values(course.title).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Please provide a course title in at least one language.',
        },
        { status: 400 },
      );
    }

    const publish_at =
      course.schedule && typeof course.schedule.publishAt === 'string'
        ? course.schedule.publishAt
        : null;
    const expire_at =
      course.schedule && typeof course.schedule.expireAt === 'string'
        ? course.schedule.expireAt
        : null;

    const baseCurriculum =
      course.curriculum && typeof course.curriculum === 'object'
        ? course.curriculum
        : { topics: [] };
    const attachmentsPayload = Array.isArray(course.attachments)
      ? course.attachments
      : Array.isArray((course.curriculum as any)?.attachments)
        ? (course.curriculum as any).attachments
        : [];
    const curriculumPayload = {
      ...baseCurriculum,
      attachments: attachmentsPayload,
    };

    const { data: newCourse, error: courseError } = await supabase
      .from('courses')
      .insert({
        title: course.title,
        description: course.description,
        xp_threshold: course.xp_threshold ?? 0,
        xp_reward: course.xp_reward ?? 0,
        published: course.published ?? false,
        order: 0,
        image_url: course.image_url ?? null,
        level: course.level || 'beginner',
        is_completed: course.is_completed ?? false,
        is_paid: course.is_paid ?? false,
        overview: course.overview ?? '',
        key_takeaways: course.key_takeaways ?? [],
        target_audience: course.target_audience ?? [],
        duration_minutes: course.duration_minutes ?? 0,
        bonuses: course.bonuses ?? [],
        special_requirements: course.special_requirements ?? [],
        seo: course.seo ?? null,
        google_integrations: course.google_integrations ?? null,
        curriculum: curriculumPayload,
        publish_at,
        expire_at,
        author_id: currentUser.userId,
      })
      .select()
      .single();

    if (courseError || !newCourse) {
      console.error('Error creating course:', courseError);
      return NextResponse.json(
        {
          success: false,
          error:
            courseError?.message ||
            'Failed to create course (database error).',
        },
        { status: 500 },
      );
    }

    // 2) Criar módulos + lições (opcional, hoje estamos a passar modules: [])
    if (modules && Array.isArray(modules) && modules.length > 0) {
      for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex++) {
        const modulePayload = modules[moduleIndex];

        const { data: newModule, error: moduleError } = await supabase
          .from('modules')
          .insert({
            course_id: newCourse.id,
            title: modulePayload.titles,
            description: modulePayload.descriptions,
            order: modulePayload.order ?? moduleIndex + 1,
          })
          .select()
          .single();

        if (moduleError || !newModule) {
          console.error('Error creating module:', moduleError);
          continue;
        }

        if (
          modulePayload.lessons &&
          Array.isArray(modulePayload.lessons) &&
          modulePayload.lessons.length > 0
        ) {
          const lessonsToInsert = modulePayload.lessons.map(
            (lesson, lessonIndex) => ({
              module_id: newModule.id,
              title: lesson.titles,
              description: lesson.descriptions,
              content: lesson.content,
              xp_reward: lesson.xp_reward ?? 20,
              xp_threshold: lesson.xp_threshold ?? 0,
              order: lesson.order ?? lessonIndex + 1,
              estimated_time: lesson.estimated_time ?? 10,
            }),
          );

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
