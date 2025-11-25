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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
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

    if (!title || typeof title !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Module title (multilingual JSON) is required.' },
        { status: 400 },
      );
    }

    // Pelo menos um título em alguma língua
    const hasAnyTitle = Object.values(title as Record<string, string>).some(
      (v) => typeof v === 'string' && v.trim().length > 0,
    );

    if (!hasAnyTitle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Please provide a module title in at least one language.',
        },
        { status: 400 },
      );
    }

    const insertPayload = {
      course_id: params.id,
      title,
      description: description || {},
      xp_threshold: typeof xp_threshold === 'number' ? xp_threshold : 0,
      xp_reward: typeof xp_reward === 'number' ? xp_reward : 0,
      image_url: image_url ?? null,
      order: typeof order === 'number' ? order : 0,
      published: !!published,
    };

    const { data: module, error: insertError } = await supabase
      .from('modules')
      .insert(insertPayload)
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .single();

    if (insertError || !module) {
      console.error(
        'Error creating module in admin modules route:',
        insertError,
      );
      return NextResponse.json(
        { success: false, error: 'Failed to create module.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      module,
      message: 'Module created successfully.',
    });
  } catch (error) {
    console.error(
      'Unexpected error in POST /api/admin/courses/[id]/modules:',
      error,
    );
    return NextResponse.json(
      { success: false, error: 'Server error' },
      { status: 500 },
    );
  }
}
