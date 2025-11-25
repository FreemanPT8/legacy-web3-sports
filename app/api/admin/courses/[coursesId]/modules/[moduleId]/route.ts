import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

const LANGUAGES = ['en', 'pt', 'es', 'fr', 'it', 'de'] as const;
type LangCode = (typeof LANGUAGES)[number];

interface UpdateModulePayload {
  title?: Record<LangCode, string>;
  description?: Record<LangCode, string>;
  xp_threshold?: number;
  xp_reward?: number;
  image_url?: string | null;
  order?: number;
}

async function checkPermission(request: NextRequest) {
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
          error: 'You do not have permission to manage courses/modules.',
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user: currentUser };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } },
) {
  const perm = await checkPermission(request);
  if (!perm.ok) return perm.response;

  try {
    const { moduleId } = params;
    const body = (await request.json()) as UpdateModulePayload;

    const updateData: any = {};

    if (body.title) updateData.title = body.title;
    if (body.description) updateData.description = body.description;
    if (typeof body.xp_threshold === 'number')
      updateData.xp_threshold = body.xp_threshold;
    if (typeof body.xp_reward === 'number')
      updateData.xp_reward = body.xp_reward;
    if (typeof body.image_url !== 'undefined')
      updateData.image_url = body.image_url;
    if (typeof body.order === 'number') updateData.order = body.order;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update.' },
        { status: 400 },
      );
    }

    const { data: updatedModule, error: updateError } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .single();

    if (updateError || !updatedModule) {
      console.error('Error updating module:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update module.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      module: updatedModule,
      message: 'Module updated successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/courses/[courseId]/modules/[moduleId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { courseId: string; moduleId: string } },
) {
  const perm = await checkPermission(request);
  if (!perm.ok) return perm.response;

  try {
    const { moduleId } = params;

    const { error: deleteError } = await supabase
      .from('modules')
      .delete()
      .eq('id', moduleId);

    if (deleteError) {
      console.error('Error deleting module:', deleteError);
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
    console.error('Unexpected error in DELETE /api/admin/courses/[courseId]/modules/[moduleId]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
