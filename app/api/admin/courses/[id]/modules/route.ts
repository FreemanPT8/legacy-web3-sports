// app/api/admin/courses/[id]/modules/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

// ✅ Verifica se o user pode gerir cursos
async function assertCanManageCourses(request: NextRequest) {
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

  return { ok: true as const, user: currentUser, role };
}

// GET /api/admin/courses/[id]/modules
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await assertCanManageCourses(request);
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

// POST /api/admin/courses/[id]/modules  → criar módulo
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const auth = await assertCanManageCourses(request);
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

    // Pelo menos um título em qualquer língua
    if (
      !title ||
      typeof title !== 'object' ||
      !Object.values(title).some(
        (v) => typeof v === 'string' && v.trim().length > 0,
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Module title is required in at least one language.',
        },
        { status: 400 },
      );
    }

    const insertPayload: Record<string, any> = {
      course_id: params.id,
      title,
      description: description || {},
      xp_threshold: typeof xp_threshold === 'number' ? xp_threshold : 0,
      xp_reward: typeof xp_reward === 'number' ? xp_reward : 0,
      image_url: typeof image_url === 'string' ? image_url : null,
      order: typeof order === 'number' ? order : 0,
    };

    // ⚠️ published só funciona se já tiveres adicionado a coluna na tabela
    if (typeof published === 'boolean') {
      insertPayload.published = published;
    }

    const { data: newModule, error: insertError } = await supabase
      .from('modules')
      .insert(insertPayload)
      .select(
        `
        *,
        lessons:lessons(*)
      `,
      )
      .single();

    if (insertError || !newModule) {
      console.error('Error creating module:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to create module.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      module: newModule,
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
