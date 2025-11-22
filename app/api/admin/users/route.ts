// app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import { userHasPermission } from '@/lib/permissions';

type UserRole = 'Super Admin' | 'Admin' | 'Member';

interface UserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
  country: string | null;
  xp_total: number | null;
  created_at: string | null;
}

interface ListResponse {
  success: boolean;
  users?: {
    id: string;
    username: string | null;
    full_name: string | null;
    email: string | null;
    role: UserRole;
    country: string | null;
    xp_total: number;
    created_at: string | null;
  }[];
  error?: string;
}

interface PatchResponse {
  success: boolean;
  error?: string;
}

interface DeleteResponse {
  success: boolean;
  error?: string;
}

// Apenas roles válidos
const VALID_ROLES: UserRole[] = ['Super Admin', 'Admin', 'Member'];

// GET /api/admin/users
// Lista todos os utilizadores (Admin / Super Admin)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();

    const { data, error } = await supabaseAdmin
      .from('users')
      .select(
        'id, username, full_name, email, role, country, xp_total, created_at',
      )
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error in GET /api/admin/users:', error);
      return NextResponse.json<ListResponse>(
        { success: false, error: 'Error loading users.' },
        { status: 500 },
      );
    }

    const rows = (data || []) as UserRow[];

    let filtered = rows;
    if (search) {
      filtered = rows.filter((u) => {
        const name = (u.full_name || '').toLowerCase();
        const username = (u.username || '').toLowerCase();
        const email = (u.email || '').toLowerCase();
        return (
          name.includes(search) ||
          username.includes(search) ||
          email.includes(search)
        );
      });
    }

    const users = filtered.map((u) => ({
      id: u.id,
      username: u.username,
      full_name: u.full_name,
      email: u.email,
      role: (VALID_ROLES.includes(u.role as UserRole)
        ? (u.role as UserRole)
        : 'Member') as UserRole,
      country: u.country ?? null,
      xp_total: u.xp_total ?? 0,
      created_at: u.created_at,
    }));

    return NextResponse.json<ListResponse>(
      { success: true, users },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in GET /api/admin/users:', err);
    return NextResponse.json<ListResponse>(
      { success: false, error: 'Unexpected error loading users.' },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/users
// body: { userId: string; role: 'Super Admin' | 'Admin' | 'Member' }
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;

  // Tem de ter permissão de gestão de utilizadores
  const canManage = await userHasPermission(
    currentUser.userId,
    currentUser.role,
    'canManageUsers',
  );

  if (!canManage) {
    return NextResponse.json<PatchResponse>(
      { success: false, error: 'Permission denied: cannot manage users.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({} as any))) as {
      userId?: string;
      role?: UserRole;
    };
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'userId and role are required.' },
        { status: 400 },
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Invalid role value.' },
        { status: 400 },
      );
    }

    // Não pode alterar o próprio papel
    if (userId === currentUser.userId) {
      return NextResponse.json<PatchResponse>(
        {
          success: false,
          error: "You can't change your own role.",
        },
        { status: 400 },
      );
    }

    // Obter utilizador alvo
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error(
        'Supabase error loading current user in PATCH /api/admin/users:',
        targetError,
      );
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Error loading user.' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'User not found.' },
        { status: 404 },
      );
    }

    const currentRole = targetUser.role as UserRole | null;
    const isCurrentSuperAdmin = currentUser.role === 'Super Admin';

    // Apenas Super Admin pode mexer em papéis de Super Admin
    if (
      (!isCurrentSuperAdmin && currentRole === 'Super Admin') ||
      (!isCurrentSuperAdmin && role === 'Super Admin')
    ) {
      return NextResponse.json<PatchResponse>(
        {
          success: false,
          error: 'Only Super Admin can change Super Admin roles.',
        },
        { status: 403 },
      );
    }

    // Se estamos a tirar o papel de Super Admin, garantir que não é o último
    if (currentRole === 'Super Admin' && role !== 'Super Admin') {
      const { data: superAdmins, error: superAdminsError } =
        await supabaseAdmin
          .from('users')
          .select('id')
          .eq('role', 'Super Admin');

      if (superAdminsError) {
        console.error(
          'Supabase error counting Super Admins in PATCH /api/admin/users:',
          superAdminsError,
        );
        return NextResponse.json<PatchResponse>(
          { success: false, error: 'Error checking Super Admins.' },
          { status: 500 },
        );
      }

      const count = (superAdmins || []).length;
      if (count <= 1) {
        return NextResponse.json<PatchResponse>(
          {
            success: false,
            error:
              'Cannot change role: this is the last Super Admin in the system.',
          },
          { status: 400 },
        );
      }
    }

    // Atualizar role
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (updateError) {
      console.error(
        'Supabase error updating role in PATCH /api/admin/users:',
        updateError,
      );
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Error updating user role.' },
        { status: 500 },
      );
    }

    return NextResponse.json<PatchResponse>(
      { success: true },
      { status: 200 },
    );
  } catch (err) {
    console.error('Unexpected error in PATCH /api/admin/users:', err);
    return NextResponse.json<PatchResponse>(
      { success: false, error: 'Unexpected error updating user role.' },
      { status: 500 },
    );
  }
}

// DELETE /api/admin/users
// body: { userId: string }
export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;

  // Tem de ter permissão de gestão de utilizadores
  const canManage = await userHasPermission(
    currentUser.userId,
    currentUser.role,
    'canManageUsers',
  );

  if (!canManage) {
    return NextResponse.json<DeleteResponse>(
      { success: false, error: 'Permission denied: cannot manage users.' },
      { status: 403 },
    );
  }

  // Apenas Super Admin pode apagar utilizadores
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json<DeleteResponse>(
      {
        success: false,
        error: 'Only Super Admin can delete users.',
      },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json().catch(() => ({} as any))) as {
      userId?: string;
    };
    const { userId } = body;

    if (!userId) {
      return NextResponse.json<DeleteResponse>(
        { success: false, error: 'userId is required.' },
        { status: 400 },
      );
    }

    if (userId === currentUser.userId) {
      return NextResponse.json<DeleteResponse>(
        {
          success: false,
          error: "You can't delete your own account from here.",
        },
        { status: 400 },
      );
    }

    // Ver se o alvo é Super Admin
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error(
        'Supabase error loading user in DELETE /api/admin/users:',
        targetError,
      );
      return NextResponse.json<DeleteResponse>(
        { success: false, error: 'Error loading user.' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json<DeleteResponse>(
        { success: false, error: 'User not found.' },
        { status: 404 },
      );
    }

    const targetRole = targetUser.role as UserRole | null;

    if (targetRole === 'Super Admin') {
      // Garantir que não apagamos o último Super Admin
      const { data: superAdmins, error: superAdminsError } =
        await supabaseAdmin
          .from('users')
          .select('id')
          .eq('role', 'Super Admin');

      if (superAdminsError) {
        console.error(
          'Supabase error counting Super Admins in DELETE /api/admin/users:',
          superAdminsError,
        );
        return NextResponse.json<DeleteResponse>(
          { success: false, error: 'Error checking Super Admins.' },
          { status: 500 },
        );
      }

      const count = (superAdmins || []).length;
      if (count <= 1) {
        return NextResponse.json<DeleteResponse>(
          {
            success: false,
            error:
              'Cannot delete this user: this is the last Super Admin in the system.',
          },
          { status: 400 },
        );
      }
    }

    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      console.error(
        'Supabase error deleting user in DELETE /api/admin/users:',
        deleteError,
      );
      return NextResponse.json<DeleteResponse>(
        { success: false, error: 'Error deleting user.' },
        { status: 500 },
      );
    }

    return NextResponse.json<DeleteResponse>({ success: true }, { status: 200 });
  } catch (err) {
    console.error('Unexpected error in DELETE /api/admin/users:', err);
    return NextResponse.json<DeleteResponse>(
      { success: false, error: 'Unexpected error deleting user.' },
      { status: 500 },
    );
  }
}
