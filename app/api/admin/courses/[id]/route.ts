// app/api/admin/courses/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const { data, error } = await supabase
      .from('courses')
      .select(
        `
        *,
        modules:modules(
          *,
          lessons:lessons(*)
        )
      `,
      )
      .eq('id', params.id)
      .single();

    if (error || !data) {
      console.error('Error loading course by id (admin):', error);
      return NextResponse.json(
        { success: false, error: 'Course not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      course: data,
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const body = await request.json();
    const { course } = body || {};

    if (!course) {
      return NextResponse.json(
        { success: false, error: 'Missing course payload.' },
        { status: 400 },
      );
    }

    const {
      title,
      description,
      level,
      xp_threshold,
      published,
      image_url,
      xp_reward,
      is_completed,
    } = course;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 },
      );
    }

    // Buscar estado anterior (para saber se acabou de ficar completed)
    const { data: existing, error: existingError } = await supabase
      .from('courses')
      .select('id, is_completed, xp_reward')
      .eq('id', params.id)
      .maybeSingle();

    if (existingError || !existing) {
      console.error('Error loading existing course before update:', existingError);
      return NextResponse.json(
        { success: false, error: 'Course not found.' },
        { status: 404 },
      );
    }

    const wasCompleted = !!existing.is_completed;
    const now = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('courses')
      .update({
        title,
        description,
        level: level || 'beginner',
        xp_threshold: typeof xp_threshold === 'number' ? xp_threshold : 0,
        published: !!published,
        image_url: image_url ?? null,
        xp_reward: typeof xp_reward === 'number' ? xp_reward : existing.xp_reward ?? 0,
        is_completed: typeof is_completed === 'boolean' ? is_completed : wasCompleted,
        updated_at: now,
      })
      .eq('id', params.id)
      .select()
      .single();

    if (updateError || !updated) {
      console.error('Error updating course:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to update course.' },
        { status: 500 },
      );
    }

    // Se acabou de ser marcado como completed e tem XP extra, aplicar XP retroativo
    const justCompleted =
      !wasCompleted && !!updated.is_completed && (updated.xp_reward ?? 0) > 0;

    if (justCompleted) {
      const { error: rpcError } = await supabase.rpc(
        'apply_course_completion_xp',
        { p_course_id: params.id },
      );

      if (rpcError) {
        console.error(
          'Error applying retro course XP via apply_course_completion_xp:',
          rpcError,
        );
      }
    }

    return NextResponse.json({
      success: true,
      course: updated,
      message: 'Course updated successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in PUT /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Apenas Super Admin pode apagar cursos
  if (role !== 'Super Admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Only Super Admin can delete courses.',
      },
      { status: 403 },
    );
  }

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
    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', params.id);

    if (deleteError) {
      console.error('Error deleting course:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete course.' },
        { status: 500 },
      );
    }

    // FK com ON DELETE CASCADE trata de módulos e lições
    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully.',
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/admin/courses/[id]:', error);
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
