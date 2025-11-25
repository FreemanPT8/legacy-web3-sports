import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
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
    // 3) Carregar módulos do curso, com lições
    const { data: modules, error } = await supabase
      .from('modules')
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .eq('course_id', params.id)
      .order('order', { ascending: true });

    if (error) {
      console.error(
        'Error loading modules for course in admin endpoint:',
        error,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to load modules.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      modules: modules || [],
    });
  } catch (error) {
    console.error(
      'Unexpected error in GET /api/admin/courses/[id]/modules:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
