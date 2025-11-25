import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  // Autorização básica
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Verificar permissão fina
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
  // Autorização básica
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const role = (currentUser.role || 'Member') as UserRole;

  // Verificar permissão fina
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
    } = course;

    if (!title) {
      return NextResponse.json(
        { success: false, error: 'Title is required.' },
        { status: 400 },
      );
    }

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
