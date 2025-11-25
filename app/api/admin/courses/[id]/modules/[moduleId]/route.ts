import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

async function handleUpdate(
  request: NextRequest,
  params: { id: string; moduleId: string },
) {
  // 1) Autorização básica
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // 2) Permissão fina
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

    // Aceitamos vários campos, mas só usamos os seguros por agora
    const {
      xp_threshold,
      order,
      // image_url,
      // xp_reward_on_complete,
      // ...rest
    } = body || {};

    // Pelo menos um campo para atualizar
    if (
      typeof xp_threshold !== 'number' &&
      typeof order !== 'number'
      // &&
      // typeof image_url !== 'string' &&
      // typeof xp_reward_on_complete !== 'number'
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided. (xp_threshold, order are supported)',
        },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, any> = {};
    if (typeof xp_threshold === 'number') {
      updatePayload.xp_threshold = xp_threshold;
    }
    if (typeof order === 'number') {
      updatePayload.order = order;
    }

    // Se/Quando adicionarmos colunas novas na tabela "modules",
    // basta descomentar/ajustar aqui:
    //
    // if (typeof image_url === 'string') {
    //   updatePayload.image_url = image_url;
    // }
    // if (typeof xp_reward_on_complete === 'number') {
    //   updatePayload.xp_reward_on_complete = xp_reward_on_complete;
    // }

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

// Suportar PATCH e PUT para sermos compatíveis com o que o frontend estiver a usar
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
