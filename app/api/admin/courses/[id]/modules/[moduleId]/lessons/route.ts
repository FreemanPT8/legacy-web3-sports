import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { type UserRole } from '@/lib/permissions';
import { userHasPermission } from '@/lib/server/permissions';

type AuthOk =
  | { ok: true; user: { userId: string; role?: string | null }; role: UserRole }
  | { ok: false; response: NextResponse };

async function ensureCanManageCourses(request: NextRequest): Promise<AuthOk> {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return { ok: false, response: authResult.response! };
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  const canManageCourses = await userHasPermission(
    currentUser.userId,
    role,
    'canManageCourses',
  );

  if (!canManageCourses) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to manage courses.',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user: currentUser, role };
}

// GET → listar lições de um módulo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
) {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    // validar que o módulo pertence ao curso
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found for this course.' },
        { status: 404 },
      );
    }

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('*')
      .eq('module_id', params.moduleId)
      .order('order', { ascending: true });

    if (lessonsError) {
      console.error(
        'Error loading lessons for module in admin endpoint:',
        lessonsError,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to load lessons.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lessons: lessons || [],
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/courses/[id]/modules/[moduleId]/lessons:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// POST → criar nova lição no módulo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
) {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const {
      title,
      description,
      content,
      xp_reward,
      xp_threshold,
      order,
      estimated_time,
      image_url,
      file_url,
      // published, // ⚠ só quando a coluna existir na BD
    } = body || {};

    if (
      !title ||
      typeof title !== 'object' ||
      !Object.values(title).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Lesson title is required in at least one language.',
        },
        { status: 400 },
      );
    }

    // validar que o módulo pertence ao curso
    const { data: module, error: moduleError } = await supabase
      .from('modules')
      .select('id, course_id')
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .single();

    if (moduleError || !module) {
      return NextResponse.json(
        { success: false, error: 'Module not found for this course.' },
        { status: 404 },
      );
    }

    const insertPayload: Record<string, any> = {
      module_id: params.moduleId,
      title,
      description: description || {},
      content: content || {},
      xp_reward: typeof xp_reward === 'number' ? xp_reward : 20,
      xp_threshold: typeof xp_threshold === 'number' ? xp_threshold : 0,
      order: typeof order === 'number' ? order : 0,
      estimated_time: typeof estimated_time === 'number' ? estimated_time : 10,
      image_url: typeof image_url === 'string' ? image_url : null,
      file_url: typeof file_url === 'string' ? file_url : null,
    };

    // ⚠ se/cando adicionares coluna published na tabela lessons, podes ativar:
    // if (typeof published === 'boolean') {
    //   insertPayload.published = published;
    // }

    const { data: newLesson, error: insertError } = await supabase
      .from('lessons')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError || !newLesson) {
      console.error('Error creating lesson:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create lesson.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lesson: newLesson,
      message: 'Lesson created successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in POST /api/admin/courses/[id]/modules/[moduleId]/lessons:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
