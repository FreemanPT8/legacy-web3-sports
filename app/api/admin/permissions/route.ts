// app/api/admin/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAdmin } from '@/lib/middleware';
import type { Permission } from '@/lib/permissions';
import {
  ADMIN_TOGGLABLE_PERMISSIONS,
  getRolePermissions,
} from '@/lib/permissions';

interface AdminPermissionsRow {
  id: string;
  user_id: string;
  permissions: Permission[];
}

interface AdminUserRow {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin' | string;
}

interface AdminPermissionsDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin';
  basePermissions: Permission[];
  extraPermissions: Permission[];
}

interface PermissionsGetResponse {
  success: boolean;
  admins?: AdminPermissionsDTO[];
  error?: string;
}

interface PermissionsPostBody {
  userId: string;
  permissions: Permission[];
}

interface PermissionsPostResponse {
  success: boolean;
  error?: string;
}

// GET -> lista de Admins + permissões
export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (auth.user!.role !== 'Super Admin') {
    return NextResponse.json<PermissionsGetResponse>(
      { success: false, error: 'Only Super Admin can manage permissions.' },
      { status: 403 },
    );
  }

  try {
    // 1) Buscar todos os Admins e Super Admins
    const { data: usersData, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, username, full_name, email, role')
      .in('role', ['Admin', 'Super Admin'])
      .order('role', { ascending: false }) // Super Admins primeiro
      .order('username', { ascending: true });

    if (usersError) {
      console.error('Error loading admin users:', usersError);
      return NextResponse.json<PermissionsGetResponse>(
        { success: false, error: 'Failed to load admin users.' },
        { status: 500 },
      );
    }

    const admins = (usersData || []) as AdminUserRow[];
    if (admins.length === 0) {
      return NextResponse.json<PermissionsGetResponse>({
        success: true,
        admins: [],
      });
    }

    const adminIds = admins.map((a) => a.id);

    // 2) Buscar linhas de admin_permissions
    const { data: permsData, error: permsError } = await supabaseAdmin
      .from('admin_permissions')
      .select('id, user_id, permissions')
      .in('user_id', adminIds);

    if (permsError) {
      console.error('Error loading admin_permissions:', permsError);
    }

    const permsByUserId = new Map<string, AdminPermissionsRow>();
    for (const row of (permsData || []) as any[]) {
      permsByUserId.set(row.user_id as string, {
        id: row.id as string,
        user_id: row.user_id as string,
        permissions: (row.permissions as Permission[]) ?? [],
      });
    }

    // 3) Montar DTO
    const result: AdminPermissionsDTO[] = admins.map((u) => {
      const basePermissions = getRolePermissions(u.role);
      const extraRow = permsByUserId.get(u.id);
      let extraPermissions = (extraRow?.permissions || []) as Permission[];

      // Só permitimos togglar as permissões da lista ADMIN_TOGGLABLE_PERMISSIONS
      extraPermissions = extraPermissions.filter((p) =>
        ADMIN_TOGGLABLE_PERMISSIONS.includes(p),
      );

      return {
        id: u.id,
        username: u.username,
        full_name: u.full_name,
        email: u.email,
        role: u.role as 'Admin' | 'Super Admin',
        basePermissions,
        extraPermissions,
      };
    });

    return NextResponse.json<PermissionsGetResponse>({
      success: true,
      admins: result,
    });
  } catch (err: any) {
    console.error('Unexpected error in GET /api/admin/permissions:', err);
    return NextResponse.json<PermissionsGetResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST -> definir permissões extra de um Admin
export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  if (auth.user!.role !== 'Super Admin') {
    return NextResponse.json<PermissionsPostResponse>(
      { success: false, error: 'Only Super Admin can change permissions.' },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as PermissionsPostBody;
    const userId = body.userId?.trim();
    let permissions = (body.permissions || []) as Permission[];

    if (!userId) {
      return NextResponse.json<PermissionsPostResponse>(
        { success: false, error: 'userId is required.' },
        { status: 400 },
      );
    }

    // Normalizar lista de permissões: remover duplicados e invalidas
    const allowed = new Set(ADMIN_TOGGLABLE_PERMISSIONS);
    permissions = Array.from(
      new Set(permissions.filter((p) => allowed.has(p))),
    ) as Permission[];

    // Validar se o target é Admin (não alteramos Super Admins)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', userId)
      .maybeSingle();

    if (userError) {
      console.error('Error loading target user in permissions POST:', userError);
      return NextResponse.json<PermissionsPostResponse>(
        { success: false, error: 'Failed to validate target user.' },
        { status: 500 },
      );
    }

    if (!userData) {
      return NextResponse.json<PermissionsPostResponse>(
        { success: false, error: 'Target user not found.' },
        { status: 404 },
      );
    }

    if (userData.role !== 'Admin') {
      return NextResponse.json<PermissionsPostResponse>(
        {
          success: false,
          error: 'Only Admin users can have permissions customized.',
        },
        { status: 400 },
      );
    }

    // Upsert em admin_permissions
    const { error: upsertError } = await supabaseAdmin
      .from('admin_permissions')
      .upsert(
        {
          user_id: userId,
          permissions,
        },
        { onConflict: 'user_id' },
      );

    if (upsertError) {
      console.error(
        'Error upserting admin_permissions in POST /api/admin/permissions:',
        upsertError,
      );
      return NextResponse.json<PermissionsPostResponse>(
        { success: false, error: 'Failed to update permissions.' },
        { status: 500 },
      );
    }

    return NextResponse.json<PermissionsPostResponse>({ success: true });
  } catch (err: any) {
    console.error('Unexpected error in POST /api/admin/permissions:', err);
    return NextResponse.json<PermissionsPostResponse>(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
