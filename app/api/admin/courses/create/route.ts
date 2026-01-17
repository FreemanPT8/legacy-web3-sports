import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { type UserRole } from '@/lib/permissions';
import { userHasPermission } from '@/lib/server/permissions';

type LangCode = 'pt' | 'es' | 'en';

interface CoursePayload {
  title: Record<LangCode, string>;
  description: Record<LangCode, string>;
  level?: string;
  academy_level_slug?: string | null;
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
  cover_asset?: any;
}

const buildCurriculumMetadata = (
  course: CoursePayload,
  attachments: any[],
) => ({
  overview: course.overview ?? '',
  keyTakeaways: Array.isArray(course.key_takeaways)
    ? course.key_takeaways
    : [],
  targetAudience: Array.isArray(course.target_audience)
    ? course.target_audience
    : [],
  durationMinutes:
    typeof course.duration_minutes === 'number' ? course.duration_minutes : 0,
  bonuses: Array.isArray(course.bonuses) ? course.bonuses : [],
  specialRequirements: Array.isArray(course.special_requirements)
    ? course.special_requirements
    : [],
  attachments,
  seo: course.seo ?? null,
  googleIntegrations: course.google_integrations ?? null,
  xpReward: typeof course.xp_reward === 'number' ? course.xp_reward : 0,
  xpThreshold: typeof course.xp_threshold === 'number' ? course.xp_threshold : 0,
  level: course.level || 'beginner',
  academyLevelSlug: course.academy_level_slug ?? null,
  coverAsset: course.cover_asset ?? null,
  isCompleted: !!course.is_completed,
  isPaid: !!course.is_paid,
  schedule: course.schedule ?? null,
});

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
    };

    const { course } = body;

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
    const metadataPayload = buildCurriculumMetadata(
      course,
      attachmentsPayload,
    );
    const curriculumPayload = {
      ...baseCurriculum,
      attachments: attachmentsPayload,
      metadata: {
        ...(typeof baseCurriculum.metadata === 'object'
          ? baseCurriculum.metadata
          : {}),
        ...metadataPayload,
      },
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
        seo: course.seo ?? null,
        google_integrations: course.google_integrations ?? null,
        curriculum: curriculumPayload,
        publish_at,
        expire_at,
        academy_level_slug: course.academy_level_slug ?? null,
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
