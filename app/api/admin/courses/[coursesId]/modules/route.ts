import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

const LANGUAGES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type LangCode = (typeof LANGUAGES)[number];

interface CreateModulePayload {
  title: Record<LangCode, string>;
  description: Record<LangCode, string>;
  xp_threshold?: number;
  xp_reward?: number;
  image_url?: string | null;
  order?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { courseId: string } },
) {
  // 1) Check admin / super admin
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // 2) Check fine-grained permission canManageCourses
  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  if (!canManageCourses) {
    return NextResponse.json(
      {
        success: false,
        error: 'You do not have permission to manage courses/modules.',
      },
      { status: 403 },
    );
  }

  try {
    const courseId = params.courseId;
    const body = (await request.json()) as CreateModulePayload;

    const { title, description, xp_threshold, xp_reward, image_url, order } =
      body;

    if (!title || typeof title !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Module title is required.' },
        { status: 400 },
      );
    }

    // Pelo menos um título em alguma língua
    const hasAnyTitle = LANGUAGES.some((lang) => {
      const v = (title as any)[lang];
      return typeof v === 'string' && v.trim().length > 0;
    });

    if (!hasAnyTitle) {
      return NextResponse.json(
        {
          success: false,
          error: 'At least one language title is required for the module.',
        },
        { status: 400 },
      );
    }

    // Se não vier "order", calcular: último+1
    let moduleOrder = order;
    if (!moduleOrder || moduleOrder <= 0) {
      const { data: existingModules, error: countError } = await supabase
        .from('modules')
        .select('id, "order"')
        .eq('course_id', courseId)
        .order('order', { ascending: false })
        .limit(1);

      if (countError) {
        console.error('Error fetching modules for order:', countError);
        return NextResponse.json(
          { success: false, error: 'Failed to determine module order.' },
          { status: 500 },
        );
      }

      if (existingModules && existingModules.length > 0) {
        moduleOrder = (existingModules[0].order || 0) + 1;
      } else {
        moduleOrder = 1;
      }
    }

    const { data: newModule, error: insertError } = await supabase
      .from('modules')
      .insert({
        course_id: courseId,
        title,
        description,
        xp_threshold: xp_threshold ?? 0,
        xp_reward: xp_reward ?? 0,
        image_url: image_url || null,
        order: moduleOrder,
      })
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .single();

    if (insertError || !newModule) {
      console.error('Error inserting module:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create module.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      module: newModule,
      message: 'Module created successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in POST /api/admin/courses/[courseId]/modules:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
