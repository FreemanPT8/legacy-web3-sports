// app/api/admin/courses/[id]/modules/[moduleId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type EnsureResult =
  | { ok: true; user: any }
  | { ok: false; response: NextResponse };

async function ensureCanManageCourses(
  request: NextRequest,
): Promise<EnsureResult> {
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

  return { ok: true, user: currentUser };
}

async function handleUpdate(
  request: NextRequest,
  params: { id: string; moduleId: string },
): Promise<NextResponse> {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();

    const {
      title,
      description,
      xp_threshold,
      xp_reward,
      image_url,
      order,
      published,
      is_completed,
    } = body || {};

    // Buscar estado anterior do módulo
    const { data: existing, error: existingError } = await supabase
      .from('modules')
      .select('id, course_id, is_completed, xp_reward')
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .maybeSingle();

    if (existingError || !existing) {
      console.error(
        'Error loading existing module before update:',
        existingError,
      );
      return NextResponse.json(
        { success: false, error: 'Module not found.' },
        { status: 404 },
      );
    }

    const wasCompleted = !!existing.is_completed;

    const updatePayload: Record<string, any> = {};

    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (typeof xp_threshold === 'number') {
      updatePayload.xp_threshold = xp_threshold;
    }
    if (typeof xp_reward === 'number') {
      updatePayload.xp_reward = xp_reward;
    }
    if (typeof order === 'number') {
      updatePayload.order = order;
    }
    if (typeof image_url === 'string' || image_url === null) {
      updatePayload.image_url = image_url;
    }
    if (typeof published === 'boolean') {
      updatePayload.published = published;
    }
    if (typeof is_completed === 'boolean') {
      updatePayload.is_completed = is_completed;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided. (title, description, xp_threshold, xp_reward, order, image_url, published, is_completed)',
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('modules')
      .update(updatePayload)
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .single();

    if (updateError || !updated) {
      console.error(
        'Error updating module in admin modules route:',
        updateError,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to update module.' },
        { status: 500 },
      );
    }

    // Se acabou de ser marcado como completed e tem XP extra, aplica XP retroativo
    const justCompleted =
      !wasCompleted && !!updated.is_completed && (updated.xp_reward ?? 0) > 0;

    if (justCompleted) {
      const { error: rpcError } = await supabase.rpc(
        'apply_module_completion_xp',
        { p_module_id: params.moduleId },
      );

      if (rpcError) {
        console.error(
          'Error applying retro module XP via apply_module_completion_xp:',
          rpcError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      module: updated,
      message: 'Module updated successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in UPDATE /api/admin/courses/[id]/modules/[moduleId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
): Promise<Response> {
  return handleUpdate(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
): Promise<Response> {
  return handleUpdate(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
): Promise<Response> {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    const { error: deleteError } = await supabase
      .from('modules')
      .delete()
      .eq('id', params.moduleId)
      .eq('course_id', params.id);

    if (deleteError) {
      console.error(
        'Error deleting module in admin modules route:',
        deleteError,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to delete module.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Module deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/admin/courses/[id]/modules/[moduleId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
