import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

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

// GET → (opcional, se precisares de editar num ecrã separado)
export async function GET(
  request: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('id', params.lessonId)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: 'Lesson not found.' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      lesson: data,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/lessons/[lessonId]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// PUT → atualizar lição
export async function PUT(
  request: NextRequest,
  { params }: { params: { lessonId: string } },
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
      // published, // ⚠ só quando a coluna existir
    } = body || {};

    const updatePayload: Record<string, any> = {};

    if (title) updatePayload.title = title;
    if (description) updatePayload.description = description;
    if (content) updatePayload.content = content;
    if (typeof xp_reward === 'number') updatePayload.xp_reward = xp_reward;
    if (typeof xp_threshold === 'number')
      updatePayload.xp_threshold = xp_threshold;
    if (typeof order === 'number') updatePayload.order = order;
    if (typeof estimated_time === 'number')
      updatePayload.estimated_time = estimated_time;
    if (typeof image_url === 'string' || image_url === null)
      updatePayload.image_url = image_url;
    if (typeof file_url === 'string' || file_url === null)
      updatePayload.file_url = file_url;

    // if (typeof published === 'boolean') {
    //   updatePayload.published = published;
    // }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No updatable fields provided. (title, description, content, xp_reward, xp_threshold, order, estimated_time, image_url, file_url)',
        },
        { status: 400 },
      );
    }

    const { data: updated, error: updateError } = await supabase
      .from('lessons')
      .update(updatePayload)
      .eq('id', params.lessonId)
      .select('*')
      .single();

    if (updateError || !updated) {
      console.error('Error updating lesson in admin route:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update lesson.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      lesson: updated,
      message: 'Lesson updated successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/lessons/[lessonId]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

// DELETE → apagar lição
export async function DELETE(
  request: NextRequest,
  { params }: { params: { lessonId: string } },
) {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
    const { error: deleteError } = await supabase
      .from('lessons')
      .delete()
      .eq('id', params.lessonId);

    if (deleteError) {
      console.error('Error deleting lesson in admin route:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete lesson.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lesson deleted successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in DELETE /api/admin/lessons/[lessonId]:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
