// app/api/admin/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ADMIN_TOGGLABLE_PERMISSIONS,
  PERMISSION_KEYS,
  type PermissionKey,
  type UserRole,
  getRolePermissions,
} from '@/lib/permissions';

interface AdminPermissionsRow {
  id: string;
  user_id: string;
  // vamos usar esta coluna para guardar os overrides como lista de PermissionKey
  permissions: PermissionKey[] | null;
}

interface AdminUserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

interface AdminPermissionsDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin';
  basePermissions: PermissionKey[];
  extraPermissions: PermissionKey[];
}

interface GetResponse {
  success: boolean;
  admins?: AdminPermissionsDTO[];
  error?: string;
}

interface PatchBody {
  userId?: string;
  permissions?: PermissionKey[];
}

interface PatchResponse {
  success: boolean;
  error?: string;
}

function normalizeRole(role: string | null): UserRole {
  if (role === 'Super Admin' || role === 'Admin') return role;
  return 'Member';
}

// GET: lista todos os Admins / Super Admins + basePermissions + extraPermissions
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.response!;

  const current = auth.user!;
  if (current.role !== 'Super Admin') {
    return NextResponse.json<GetResponse>(
      { success: false, error: 'Only Super Admin can view permissions.' },
      { status: 403 },
    );
  }

  try {
    // 1) Buscar Admins + Super Admins
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role')
      .in('role', ['Super Admin', 'Admin']);

    if (usersError) {
      console.error('Error loading admins in /api/admin/permissions GET:', usersError);
      return NextResponse.json<GetResponse>(
        { success: false, error: 'Failed to load admins.' },
        { status: 500 },
      );
    }

    const admins = (usersData || []) as AdminUserRow[];
    if (admins.length === 0) {
      return NextResponse.json<GetResponse>({ success: true, admins: [] });
    }

    const adminIds = admins.map((u) => u.id);

    // 2) Ler overrides da admin_permissions (lista de PermissionKey[])
    const { data: permsData, error: permsError } = await supabaseAdmin
      .from('admin_permissions')
      .select('id, user_id, permissions')
      .in('user_id', adminIds);

    if (permsError) {
      // Não bloqueia — se a tabela ainda não existir, simplesmente não há overrides
      console.error('Error loading admin_permissions in GET:', permsError);
    }

    const permsRows = (permsData || []) as AdminPermissionsRow[];
    const permsByUserId = new Map<string, AdminPermissionsRow>();
    for (const row of permsRows) {
      permsByUserId.set(row.user_id, row);
    }

    // 3) Montar DTO final
    const result: AdminPermissionsDTO[] = admins
      .map((u) => {
        const role = normalizeRole(u.role);
        if (role === 'Member') {
          // por segurança, ignorar não-admins
          return null as any;
        }

        // basePermissions: o que o role tem "por defeito"
        const basePermissions = getRolePermissions(role);

        // extraPermissions: overrides gravados na BD
        const extraRow = permsByUserId.get(u.id);
        let extraPermissions = (extraRow?.permissions || []) as PermissionKey[];

        // Sanear: garantir que são PermissionKeys válidos e togglables
        extraPermissions = extraPermissions.filter((p) =>
          ADMIN_TOGGLABLE_PERMISSIONS.includes(p),
        );

        return {
          id: u.id,
          username: u.username,
          full_name: u.full_name,
          email: u.email || '',
          role,
          basePermissions,
          extraPermissions,
        };
      })
      .filter(Boolean) as AdminPermissionsDTO[];

    return NextResponse.json<GetResponse>(
      { success: true, admins: result },
      { status: 200 },
    );
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/permissions:', err);
    return NextResponse.json<GetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// PATCH: atualizar extraPermissions de um Admin (lista de PermissionKey[])
export async function PATCH(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.success) return auth.response!;

  const current = auth.user!;
  if (current.role !== 'Super Admin') {
    return NextResponse.json<PatchResponse>(
      { success: false, error: 'Only Super Admin can update permissions.' },
      { status: 403 },
    );
  }

  try {
    const body = (await req.json().catch(() => ({}))) as PatchBody;
    const userId = body.userId?.trim();
    const permissions = (body.permissions || []) as PermissionKey[];

    if (!userId) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'userId is required.' },
        { status: 400 },
      );
    }

    // Garantir que o alvo é Admin ou Super Admin
    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (targetError) {
      console.error('Error loading target user in PATCH /api/admin/permissions:', targetError);
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Failed to load target user.' },
        { status: 500 },
      );
    }

    if (!targetUser) {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Target user not found.' },
        { status: 404 },
      );
    }

    const targetRole = normalizeRole(targetUser.role);
    if (targetRole === 'Member') {
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Cannot assign admin permissions to Member.' },
        { status: 400 },
      );
    }

    // Sanear lista recebida
    const cleanedPermissions = permissions.filter((p) =>
      ADMIN_TOGGLABLE_PERMISSIONS.includes(p),
    );

    // Guardar na tabela admin_permissions (array de PermissionKey)
    const { error: upsertError } = await supabaseAdmin
      .from('admin_permissions')
      .upsert(
        {
          user_id: userId,
          permissions: cleanedPermissions,
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error('Error updating admin_permissions in PATCH:', upsertError);
      return NextResponse.json<PatchResponse>(
        { success: false, error: 'Failed to update permissions.' },
        { status: 500 },
      );
    }

    return NextResponse.json<PatchResponse>({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error('Unexpected error in PATCH /api/admin/permissions:', err);
    return NextResponse.json<PatchResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
