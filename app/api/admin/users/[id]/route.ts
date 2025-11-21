import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import type { UserRole } from '@/lib/auth';

interface RouteParams {
  params: { id: string };
}

const ALLOWED_ROLES: UserRole[] = ['Super Admin', 'Admin', 'Member'];

// PUT = atualizar dados administrativos do user (role, is_banned, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  try {
    const body = await request.json();
    const { role, is_banned } = body as {
      role?: UserRole;
      is_banned?: boolean;
    };

    if (typeof role === 'undefined' && typeof is_banned === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Nothing to update.' },
        { status: 400 }
      );
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    // Só Super Admin pode alterar ROLE ou banir alguém
    if (currentUser.role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Only Super Admins can change roles or ban users.',
        },
        { status: 403 }
      );
    }

    // impedir que alguém remova o próprio Super Admin
    if (currentUser.userId === userId && role && role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: "You can't remove your own Super Admin role.",
        },
        { status: 400 }
      );
    }

    const updateFields: Record<string, any> = {};

    if (role) {
      updateFields.role = role;
    }

    if (typeof is_banned === 'boolean') {
      updateFields.is_banned = is_banned;
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json(
        { success: false, error: 'Nothing to update.' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updateFields)
      .eq('id', userId)
      .select('id, role, is_banned')
      .maybeSingle();

    if (error) {
      console.error('Supabase error updating user (role/ban):', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to update user',
        },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, user: data });
  } catch (err: any) {
    console.error('Unexpected error in PUT /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// DELETE user (apenas Super Admin)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json(
      { success: false, error: 'Only Super Admins can delete users.' },
      { status: 403 }
    );
  }

  if (currentUser.userId === userId) {
    return NextResponse.json(
      {
        success: false,
        error: "You can't delete your own account from the admin panel.",
      },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);

    if (error) {
      console.error('Supabase error deleting user:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete user',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in DELETE /api/admin/users/[id]:', err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
