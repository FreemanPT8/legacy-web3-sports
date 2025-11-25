import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

async function ensureCanManageCourses(request: NextRequest) {
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
) {
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
    } = body || {};

    const updatePayload: Record<string, any> = {};

    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (typeof xp_threshold === 'number') {
      updatePayload.xp_threshold = xp_threshold;
    }
    if (typeof xp_reward === 'number') {
      updatePayload.x_reward = xp_reward; // corrigido para xp_reward se a coluna tiver esse nome
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

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided. (title, description, xp_threshold, xp_reward, order, image_url, published)',
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
) {
  return handleUpdate(request, params);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
) {
  return handleUpdate(request, params);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
) {
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
