// app/api/admin/users/[id]/permissions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/middleware';
import { supabaseAdmin } from '@/lib/supabase';
import {
  type UserRole,
  type PermissionKey,
  type AdminPermissions,
  ADMIN_TOGGLABLE_PERMISSIONS,
  getUserPermissions,
  updateUserPermissions,
} from '@/lib/permissions';

interface RouteParams {
  params: { id: string };
}

interface GetPermissionsResponse {
  success: boolean;
  userId?: string;
  role?: UserRole;
  permissions?: AdminPermissions;
  editable?: boolean;
  error?: string;
}

interface PatchPermissionsResponse {
  success: boolean;
  error?: string;
}

// GET /api/admin/users/[id]/permissions
// Devolve as permissões efetivas de um utilizador
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
) {
  const permResult = await requirePermission(request, 'canManageUsers');
  if (!permResult.success) return permResult.response!;

  const targetUserId = params.id;

  try {
    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError) {
      console.error(
        'Error loading target user in GET /api/admin/users/[id]/permissions:',
        targetError,
      );
      return NextResponse.json<GetPermissionsResponse>(
        { success: false, error: 'Error loading user.' },
        { status: 500 },
      );
    }

    if (!target) {
      return NextResponse.json<GetPermissionsResponse>(
        { success: false, error: 'User not found.' },
        { status: 404 },
      );
    }

    const role =
      target.role === 'Super Admin' || target.role === 'Admin'
        ? (target.role as UserRole)
        : ('Member' as UserRole);

    const permissions = await getUserPermissions(targetUserId, role);
    const editable = role === 'Admin';

    return NextResponse.json<GetPermissionsResponse>(
      {
        success: true,
        userId: targetUserId,
        role,
        permissions,
        editable,
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      'Unexpected error in GET /api/admin/users/[id]/permissions:',
      err,
    );
    return NextResponse.json<GetPermissionsResponse>(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 },
    );
  }
}

// PATCH /api/admin/users/[id]/permissions
// body: { permissions: Partial<Record<PermissionKey, boolean>> }
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
) {
  const permResult = await requirePermission(request, 'canManageUsers');
  if (!permResult.success) return permResult.response!;

  const targetUserId = params.id;

  try {
    const body = await request.json().catch(() => ({} as any));
    const { permissions } = body as {
      permissions?: Partial<Record<PermissionKey, boolean>>;
    };

    if (!permissions || typeof permissions !== 'object') {
      return NextResponse.json<PatchPermissionsResponse>(
        {
          success: false,
          error: 'permissions object is required.',
        },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('id', targetUserId)
      .maybeSingle();

    if (targetError) {
      console.error(
        'Error loading target user in PATCH /api/admin/users/[id]/permissions:',
        targetError,
      );
      return NextResponse.json<PatchPermissionsResponse>(
        { success: false, error: 'Error loading user.' },
        { status: 500 },
      );
    }

    if (!target) {
      return NextResponse.json<PatchPermissionsResponse>(
        { success: false, error: 'User not found.' },
        { status: 404 },
      );
    }

    const targetRole =
      target.role === 'Super Admin' || target.role === 'Admin'
        ? (target.role as UserRole)
        : ('Member' as UserRole);

    if (targetRole !== 'Admin') {
      return NextResponse.json<PatchPermissionsResponse>(
        {
          success: false,
          error:
            'Extra admin permissions can only be set for Admin users (not Members or Super Admins).',
        },
        { status: 400 },
      );
    }

    const partial: Partial<AdminPermissions> = {};
    for (const key of Object.keys(permissions) as PermissionKey[]) {
      if (!ADMIN_TOGGLABLE_PERMISSIONS.includes(key)) continue;
      partial[key] = !!permissions[key];
    }

    const { success, error } = await updateUserPermissions(
      targetUserId,
      partial,
    );

    if (!success) {
      return NextResponse.json<PatchPermissionsResponse>(
        { success: false, error: error || 'Failed to update permissions.' },
        { status: 500 },
      );
    }

    return NextResponse.json<PatchPermissionsResponse>(
      { success: true },
      { status: 200 },
    );
  } catch (err: any) {
    console.error(
      'Unexpected error in PATCH /api/admin/users/[id]/permissions:',
      err,
    );
    return NextResponse.json<PatchPermissionsResponse>(
      { success: false, error: err?.message || 'Internal server error.' },
      { status: 500 },
    );
  }
}
