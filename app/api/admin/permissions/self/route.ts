// app/api/admin/permissions/self/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/middleware';
import {
  getUserPermissions,
  type AdminPermissions,
  type UserRole,
} from '@/lib/permissions';

interface SelfPermissionsResponse {
  success: boolean;
  permissions?: AdminPermissions;
  role?: UserRole;
  error?: string;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response!;

  const current = auth.user!;
  const role =
    current.role === 'Super Admin' || current.role === 'Admin'
      ? (current.role as UserRole)
      : 'Member';

  try {
    const permissions = await getUserPermissions(current.userId, role);

    return NextResponse.json<SelfPermissionsResponse>(
      {
        success: true,
        permissions,
        role,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Error loading self permissions:', error);
    return NextResponse.json<SelfPermissionsResponse>(
      {
        success: false,
        error: 'Failed to load permissions.',
      },
      { status: 500 },
    );
  }
}
