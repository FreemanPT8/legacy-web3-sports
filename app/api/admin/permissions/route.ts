// app/api/admin/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import {
  type UserRole,
  type Permission,
  type PermissionKey,
  PERMISSION_KEYS,
  ADMIN_TOGGLABLE_PERMISSIONS,
  getRolePermissions,
  updateUserPermissions,
} from '@/lib/permissions';

interface AdminUserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface AdminPermissionsRow {
  user_id: string;
  can_manage_users: boolean | null;
  can_manage_houses: boolean | null;
  can_manage_heads: boolean | null;
  can_manage_onboarding: boolean | null;
  can_manage_courses: boolean | null;
  can_manage_blog: boolean | null;
  can_manage_forum: boolean | null;
  can_manage_xp: boolean | null;
  can_manage_analytics: boolean | null;
  can_manage_settings: boolean | null;
}

interface AdminPermissionsDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole; // 'Super Admin' | 'Admin'
  basePermissions: PermissionKey[];   // ⬅ arrays, não objeto
  extraPermissions: PermissionKey[];  // ⬅ arrays
}

interface PermissionsListResponse {
  success: boolean;
  admins?: AdminPermissionsDTO[];
  error?: string;
}

interface PermissionsUpdateResponse {
  success: boolean;
  error?: string;
}

// GET /api/admin/permissions
// Lista todos os Admin / Super Admin + as permissões (base + extra)
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;
  // Só Super Admin pode gerir permissões
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json<PermissionsListResponse>(
      { success: false, error: 'Only Super Admin can view permissions.' },
      { status: 403 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json<PermissionsListResponse>(
      { success: false, error: 'Supabase admin client not configured.' },
      { status: 500 },
    );
  }

  try {
    // 1) Buscar todos os utilizadores com role Admin / Super Admin
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role')
      .in('role', ['Admin', 'Super Admin'])
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('Error loading admin users in /api/admin/permissions:', usersError);
      return NextResponse.json<PermissionsListResponse>(
        { success: false, error: 'Failed to load admin users.' },
        { status: 500 },
      );
    }

    const admins = (usersData || []) as AdminUserRow[];
    if (admins.length === 0) {
      return NextResponse.json<PermissionsListResponse>({
        success: true,
        admins: [],
      });
    }

    const adminIds = admins.map((u) => u.id);

    // 2) Buscar linhas de admin_permissions para estes user_ids
    const { data: permsData, error: permsError } = await supabaseAdmin
      .from('admin_permissions')
      .select(
        'user_id, can_manage_users, can_manage_houses, can_manage_heads, can_manage_onboarding, can_manage_courses, can_manage_blog, can_manage_forum, can_manage_xp, can_manage_analytics, can_manage_settings',
      )
      .in('user_id', adminIds);

    if (permsError) {
      console.error(
        'Error loading admin_permissions in /api/admin/permissions:',
        permsError,
      );
      return NextResponse.json<PermissionsListResponse>(
        { success: false, error: 'Failed to load admin permissions.' },
        { status: 500 },
      );
    }

    const permsRows = (permsData || []) as AdminPermissionsRow[];
    const permsByUserId = new Map<string, AdminPermissionsRow>();
    for (const row of permsRows) {
      permsByUserId.set(row.user_id, row);
    }

    // Helper para transformar a linha de admin_permissions -> array de PermissionKey
    const rowToExtraPermissions = (row: AdminPermissionsRow | undefined): PermissionKey[] => {
      if (!row) return [];

      const extra: PermissionKey[] = [];

      const pushIfTrue = (col: boolean | null | undefined, key: PermissionKey) => {
        if (col) extra.push(key);
      };

      pushIfTrue(row.can_manage_users, 'canManageUsers');
      pushIfTrue(row.can_manage_houses, 'canManageHouses');
      pushIfTrue(row.can_manage_heads, 'canManageHeads');
      pushIfTrue(row.can_manage_onboarding, 'canManageOnboarding');
      pushIfTrue(row.can_manage_courses, 'canManageCourses');
      pushIfTrue(row.can_manage_blog, 'canManageBlog');
      pushIfTrue(row.can_manage_forum, 'canManageForum');
      pushIfTrue(row.can_manage_xp, 'canManageXP');
      pushIfTrue(row.can_manage_analytics, 'canManageAnalytics');
      pushIfTrue(row.can_manage_settings, 'canManageSettings');

      return extra;
    };

    // 3) Montar DTO — agora basePermissions é um array de keys ativas
    const result: AdminPermissionsDTO[] = admins.map((u) => {
      const role =
        u.role === 'Super Admin' || u.role === 'Admin' ? (u.role as UserRole) : 'Member';

      const basePermsObj = getRolePermissions(role);
      const basePermissions: PermissionKey[] = PERMISSION_KEYS.filter(
        (key) => basePermsObj[key],
      );

      const extraRow = permsByUserId.get(u.id);
      const extraPermissions = rowToExtraPermissions(extraRow);

      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email ?? '',
        role,
        basePermissions,
        extraPermissions,
      };
    });

    return NextResponse.json<PermissionsListResponse>(
      { success: true, admins: result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/permissions:', err);
    return NextResponse.json<PermissionsListResponse>(
      { success: false, error: err?.message || 'Unexpected error.' },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/permissions
// Body: { userId: string; permissions: Permission[] }
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (!authResult.success) return authResult.response!;

  const currentUser = authResult.user!;
  if (currentUser.role !== 'Super Admin') {
    return NextResponse.json<PermissionsUpdateResponse>(
      { success: false, error: 'Only Super Admin can update permissions.' },
      { status: 403 },
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json<PermissionsUpdateResponse>(
      { success: false, error: 'Supabase admin client not configured.' },
      { status: 500 },
    );
  }

  try {
    const body = await request.json().catch(() => ({} as any));
    const { userId, permissions } = body as {
      userId?: string;
      permissions?: Permission[];
    };

    if (!userId || !Array.isArray(permissions)) {
      return NextResponse.json<PermissionsUpdateResponse>(
        { success: false, error: 'userId and permissions are required.' },
        { status: 400 },
      );
    }

    // Verificar se o alvo é Admin (não mexemos em Super Admin aqui)
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error('Error loading target user in PATCH /api/admin/permissions:', targetError);
      return NextResponse.json<PermissionsUpdateResponse>(
        { success: false, error: 'Error loading target user.' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json<PermissionsUpdateResponse>(
        { success: false, error: 'Target user not found.' },
        { status: 404 },
      );
    }

    if (targetUser.role === 'Super Admin') {
      return NextResponse.json<PermissionsUpdateResponse>(
        {
          success: false,
          error: 'Cannot change permissions of a Super Admin via this endpoint.',
        },
        { status: 400 },
      );
    }

    // Construir partial: para cada permissão togglable, true se estiver no array recebido
    const requested = new Set<PermissionKey>(
      (permissions as PermissionKey[]).filter((p) =>
        ADMIN_TOGGLABLE_PERMISSIONS.includes(p),
      ),
    );

    const partial: Partial<import('@/lib/permissions').AdminPermissions> = {};
    for (const key of ADMIN_TOGGLABLE_PERMISSIONS) {
      // true / false conforme foi selecionado
      (partial as any)[key] = requested.has(key);
    }

    const updateResult = await updateUserPermissions(userId, partial);

    if (!updateResult.success) {
      return NextResponse.json<PermissionsUpdateResponse>(
        { success: false, error: updateResult.error || 'Failed to update permissions.' },
        { status: 500 },
      );
    }

    return NextResponse.json<PermissionsUpdateResponse>(
      { success: true },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/admin/permissions:', err);
    return NextResponse.json<PermissionsUpdateResponse>(
      { success: false, error: err?.message || 'Unexpected error.' },
      { status: 500 },
    );
  }
}
