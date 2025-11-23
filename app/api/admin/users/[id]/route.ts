// app/api/admin/users/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import { userHasPermission, type UserRole } from '@/lib/permissions';

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

  const currentRole: UserRole =
    currentUser.role === 'Super Admin' || currentUser.role === 'Admin'
      ? (currentUser.role as UserRole)
      : 'Member';

  // Só quem tem permissão de gestão + Super Admin pode mudar roles / banir
  const canManage = await userHasPermission(
    currentUser.userId,
    currentRole,
    'canManageUsers',
  );

  if (!canManage || currentRole !== 'Super Admin') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Only Super Admins with user management permission can change roles or ban users.',
      },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const { role, is_banned } = body as {
      role?: UserRole;
      is_banned?: boolean;
    };

    if (typeof role === 'undefined' && typeof is_banned === 'undefined') {
      return NextResponse.json(
        { success: false, error: 'Nothing to update.' },
        { status: 400 },
      );
    }

    if (role && !ALLOWED_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 },
      );
    }

    // impedir que alguém remova o próprio Super Admin
    if (currentUser.userId === userId && role && role !== 'Super Admin') {
      return NextResponse.json(
        {
          success: false,
          error: "You can't remove your own Super Admin role.",
        },
        { status: 400 },
      );
    }

    // SE vamos alterar o role para algo diferente de Super Admin,
    // e o utilizador alvo é Super Admin, garantir que não é o último.
    if (role && role !== 'Super Admin') {
      const { data: targetUser, error: targetError } = await supabaseAdmin
        .from('users')
        .select('id, role')
        .eq('id', userId)
        .maybeSingle();

      if (targetError) {
        console.error(
          'Supabase error loading target user in PUT /api/admin/users/[id]:',
          targetError,
        );
        return NextResponse.json(
          { success: false, error: 'Error loading target user.' },
          { status: 500 },
        );
      }

      if (!targetUser) {
        return NextResponse.json(
          { success: false, error: 'User not found' },
          { status: 404 },
        );
      }

      const targetRole = targetUser.role as UserRole | null;

      if (targetRole === 'Super Admin') {
        const { data: superAdmins, error: superAdminsError } =
          await supabaseAdmin.from('users').select('id').eq('role', 'Super Admin');

        if (superAdminsError) {
          console.error(
            'Supabase error counting Super Admins in PUT /api/admin/users/[id]:',
            superAdminsError,
          );
          return NextResponse.json(
            {
              success: false,
              error: 'Error checking number of Super Admins.',
            },
            { status: 500 },
          );
        }

        const count = (superAdmins || []).length;

        if (count <= 1) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Cannot change role: this is the last Super Admin in the system.',
            },
            { status: 400 },
          );
        }
      }
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
        { status: 400 },
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
        { status: 500 },
      );
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
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
      { status: 500 },
    );
  }
}

// DELETE user (apenas Super Admin com canManageUsers)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);

  if (!authResult.success) {
    return authResult.response!;
  }

  const currentUser = authResult.user!;
  const userId = params.id;

  const currentRole: UserRole =
    currentUser.role === 'Super Admin' || currentUser.role === 'Admin'
      ? (currentUser.role as UserRole)
      : 'Member';

  const canManage = await userHasPermission(
    currentUser.userId,
    currentRole,
    'canManageUsers',
  );

  if (!canManage || currentRole !== 'Super Admin') {
    return NextResponse.json(
      {
        success: false,
        error:
          'Only Super Admins with user management permission can delete users.',
      },
      { status: 403 },
    );
  }

  if (currentUser.userId === userId) {
    return NextResponse.json(
      {
        success: false,
        error: "You can't delete your own account from the admin panel.",
      },
      { status: 400 },
    );
  }

  try {
    // Ver se o utilizador alvo é Super Admin e se é o último
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error(
        'Supabase error loading target user in DELETE /api/admin/users/[id]:',
        targetError,
      );
      return NextResponse.json(
        { success: false, error: 'Error loading user.' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 },
      );
    }

    const targetRole = targetUser.role as UserRole | null;

    if (targetRole === 'Super Admin') {
      const { data: superAdmins, error: superAdminsError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'Super Admin');

      if (superAdminsError) {
        console.error(
          'Supabase error counting Super Admins in DELETE /api/admin/users/[id]:',
          superAdminsError,
        );
        return NextResponse.json(
          { success: false, error: 'Error checking Super Admins.' },
          { status: 500 },
        );
      }

      const count = (superAdmins || []).length;

      if (count <= 1) {
        return NextResponse.json(
          {
            success: false,
            error:
              'Cannot delete this user: they are the last Super Admin in the system.',
          },
          { status: 400 },
        );
      }
    }

    const { error } = await supabaseAdmin.from('users').delete().eq('id', userId);

    if (error) {
      console.error('Supabase error deleting user:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to delete user',
        },
        { status: 500 },
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
      { status: 500 },
    );
  }
}
