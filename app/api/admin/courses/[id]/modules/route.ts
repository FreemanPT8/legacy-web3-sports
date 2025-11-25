import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

type EnsureResult =
  | { ok: true; user: any }
  | { ok: false, response: NextResponse };

async function ensureCanManageCourses(request: NextRequest): Promise<EnsureResult> {
  const authResult = await requireAdmin(request);
  if (!authResult.success) {
    // authResult.response pode ser undefined pelo tipo,
    // por isso garantimos SEMPRE um NextResponse aqui.
    if (authResult.response) {
      return { ok: false, response: authResult.response };
    }
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 },
      ),
    };
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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  const auth = await ensureCanManageCourses(request);
  if (!auth.ok) return auth.response;

  try {
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
