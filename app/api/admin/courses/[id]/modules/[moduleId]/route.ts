import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

async function checkPermission(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return { ok: false as const, response: authResult.response! };
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
      ok: false as const,
      response: NextResponse.json(
        {
          success: false,
          error: 'You do not have permission to manage courses.',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true as const };
}

async function handleUpdate(
  request: NextRequest,
  params: { id: string; moduleId: string },
) {
  const perm = await checkPermission(request);
  if (!perm.ok) return perm.response;

  try {
    const body = await request.json();

    const {
      title,
      description,
      xp_threshold,
      xp_reward,
      image_url,
      order,
    } = body || {};

    const updatePayload: Record<string, any> = {};

    if (title && typeof title === 'object') {
      updatePayload.title = title;
    }
    if (description && typeof description === 'object') {
      updatePayload.description = description;
    }
    if (typeof xp_threshold === 'number') {
      updatePayload.xp_threshold = xp_threshold;
    }
    // idem nota: garantir que coluna existe em "modules"
    if (typeof xp_reward === 'number') {
      updatePayload.xp_reward = xp_reward;
    }
    if (
      typeof image_url === 'string' ||
      image_url === null
    ) {
      updatePayload.image_url = image_url;
    }
    if (typeof order === 'number') {
      updatePayload.order = order;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided (title, description, xp_threshold, xp_reward, image_url, order).',
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('modules')
      .update(updatePayload)
      .eq('id', params.moduleId)
      .eq('course_id', params.id)
      .select()
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

// PATCH e PUT para update
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

// DELETE módulo (e respetivas lições)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; moduleId: string } },
) {
  const perm = await checkPermission(request);
  if (!perm.ok) return perm.response;

  try {
    // apagar lições primeiro (caso não haja ON DELETE CASCADE)
    const { error: lessonsError } = await supabase
      .from('lessons')
      .delete()
      .eq('module_id', params.moduleId);

    if (lessonsError) {
      console.error(
        'Error deleting lessons before module delete:',
        lessonsError,
      );
      // mesmo que falhe, ainda tentamos apagar o módulo para não ficar pendurado
    }

    const { error: moduleError } = await supabase
      .from('modules')
      .delete()
      .eq('id', params.moduleId)
      .eq('course_id', params.id);

    if (moduleError) {
      console.error(
        'Error deleting module:',
        moduleError,
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
