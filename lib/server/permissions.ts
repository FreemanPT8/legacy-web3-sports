import { supabaseAdmin } from '../supabase';
import {
  type AdminPermissions,
  type PermissionKey,
  type UserRole,
  PERMISSION_KEYS,
  SUPER_ADMIN_PERMISSIONS,
  getRoleBasePermissions,
} from '../permissions';

interface AdminPermissionsRow {
  id?: string;
  user_id: string;
  permissions: string[] | null;
  can_manage_xp: boolean | null;
}

type LegacyPermissionColumn =
  | 'can_manage_users'
  | 'can_manage_houses'
  | 'can_manage_heads'
  | 'can_manage_onboarding'
  | 'can_manage_courses'
  | 'can_manage_blog'
  | 'can_manage_xp'
  | 'can_manage_analytics'
  | 'can_manage_settings';

type LegacyAdminPermissionsRow = {
  id?: string;
  user_id: string;
} & Partial<Record<LegacyPermissionColumn, boolean | null>>;

const LEGACY_COLUMN_MAP: Partial<Record<PermissionKey, LegacyPermissionColumn>> = {
  canManageUsers: 'can_manage_users',
  canManageHouses: 'can_manage_houses',
  canManageHeads: 'can_manage_heads',
  canManageOnboarding: 'can_manage_onboarding',
  canManageCourses: 'can_manage_courses',
  canManageBlog: 'can_manage_blog',
  canManageXP: 'can_manage_xp',
  canManageAnalytics: 'can_manage_analytics',
  canManageSettings: 'can_manage_settings',
};

const LEGACY_PERMISSION_COLUMNS = [
  'id',
  'user_id',
  ...Object.values(LEGACY_COLUMN_MAP),
] as const;

const POSTGRES_UNDEFINED_COLUMN = '42703';

function isMissingColumnError(error?: { code?: string } | null): boolean {
  return !!error && error.code === POSTGRES_UNDEFINED_COLUMN;
}

function mapRowToPermissions(
  row: AdminPermissionsRow | null,
  role: UserRole,
): AdminPermissions {
  const base = getRoleBasePermissions(role);
  if (!row) return { ...base };

  const overrides = new Set<string>(
    (row.permissions || []).filter((key): key is PermissionKey =>
      PERMISSION_KEYS.includes(key as PermissionKey),
    ),
  );

  const withOverrides = (key: PermissionKey, fallback: boolean) => {
    if (key === 'canManageXP' && row.can_manage_xp !== null) {
      return row.can_manage_xp;
    }
    if (overrides.has(key)) return true;
    return fallback;
  };

  return {
    canManageUsers: withOverrides('canManageUsers', base.canManageUsers),
    canManageHouses: withOverrides('canManageHouses', base.canManageHouses),
    canManageHeads: withOverrides('canManageHeads', base.canManageHeads),
    canManageOnboarding: withOverrides(
      'canManageOnboarding',
      base.canManageOnboarding,
    ),
    canManageCourses: withOverrides('canManageCourses', base.canManageCourses),
    canManageBlog: withOverrides('canManageBlog', base.canManageBlog),
    canManageXP: withOverrides('canManageXP', base.canManageXP),
    canManageAnalytics: withOverrides(
      'canManageAnalytics',
      base.canManageAnalytics,
    ),
    canManageSettings: withOverrides(
      'canManageSettings',
      base.canManageSettings,
    ),
    canCreateSports: withOverrides('canCreateSports', base.canCreateSports),
  };
}

function mapLegacyRowToPermissions(
  row: LegacyAdminPermissionsRow | null,
  role: UserRole,
): AdminPermissions {
  const base = getRoleBasePermissions(role);
  if (!row) return { ...base };

  const result: AdminPermissions = { ...base };

  for (const key of PERMISSION_KEYS) {
    const column = LEGACY_COLUMN_MAP[key];
    if (!column) continue;
    const value = row[column];
    if (typeof value === 'boolean') {
      (result as Record<PermissionKey, boolean>)[key] = value;
    }
  }

  return result;
}

async function getUserPermissionsLegacy(
  userId: string,
  role: UserRole,
): Promise<AdminPermissions> {
  if (!supabaseAdmin) {
    return getRoleBasePermissions(role);
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_permissions')
      .select(LEGACY_PERMISSION_COLUMNS.join(', '))
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading legacy admin_permissions:', error);
      return getRoleBasePermissions(role);
    }

    return mapLegacyRowToPermissions(
      (data as LegacyAdminPermissionsRow | null) ?? null,
      role,
    );
  } catch (err) {
    console.error('Unexpected legacy permissions error:', err);
    return getRoleBasePermissions(role);
  }
}

export async function getUserPermissions(
  userId: string,
  role: UserRole,
): Promise<AdminPermissions> {
  if (!supabaseAdmin) {
    return getRoleBasePermissions(role);
  }

  if (role === 'Super Admin') {
    return SUPER_ADMIN_PERMISSIONS;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_permissions')
      .select('id, user_id, permissions, can_manage_xp')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error)) {
        return getUserPermissionsLegacy(userId, role);
      }
      console.error('Error loading admin_permissions for user:', error);
      return getRoleBasePermissions(role);
    }

    return mapRowToPermissions(
      (data as AdminPermissionsRow | null) ?? null,
      role,
    );
  } catch (err) {
    if (isMissingColumnError(err as any)) {
      return getUserPermissionsLegacy(userId, role);
    }
    console.error('Unexpected error in getUserPermissions:', err);
    return getRoleBasePermissions(role);
  }
}

async function updateUserPermissionsLegacy(
  userId: string,
  partial: Partial<AdminPermissions>,
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'supabaseAdmin not configured on server.',
    };
  }

  const payload: Record<string, any> = {};
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;
    const column = LEGACY_COLUMN_MAP[key as PermissionKey];
    if (!column) continue;
    payload[column] = value;
  }

  if (Object.keys(payload).length === 0) {
    return { success: true };
  }

  try {
    const { data: existingRow, error: fetchError } = await supabaseAdmin
      .from('admin_permissions')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error checking legacy admin_permissions row:', fetchError);
      return { success: false, error: 'Failed to update permissions.' };
    }

    if (existingRow) {
      const { error } = await supabaseAdmin
        .from('admin_permissions')
        .update(payload)
        .eq('user_id', userId);
      if (error) {
        console.error('Error updating legacy admin_permissions:', error);
        return { success: false, error: 'Failed to update permissions.' };
      }
    } else {
      const { error } = await supabaseAdmin
        .from('admin_permissions')
        .insert({ user_id: userId, ...payload });
      if (error) {
        console.error('Error inserting legacy admin_permissions:', error);
        return { success: false, error: 'Failed to update permissions.' };
      }
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected legacy permissions update error:', err);
    return { success: false, error: 'Failed to update permissions.' };
  }
}

export async function updateUserPermissions(
  userId: string,
  partial: Partial<AdminPermissions>,
): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return {
      success: false,
      error: 'supabaseAdmin not configured on server.',
    };
  }

  try {
    const { data: existingRow, error: fetchError } = await supabaseAdmin
      .from('admin_permissions')
      .select('id, permissions, can_manage_xp')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) {
      if (isMissingColumnError(fetchError)) {
        return updateUserPermissionsLegacy(userId, partial);
      }
      console.error('Error checking admin_permissions row:', fetchError);
      return { success: false, error: 'Failed to update permissions.' };
    }

    const overrideSet = new Set<string>(
      ((existingRow?.permissions || []) as string[]).filter((key) =>
        PERMISSION_KEYS.includes(key as PermissionKey),
      ),
    );

    let xpOverride: boolean | undefined;

    for (const [key, value] of Object.entries(partial)) {
      if (value === undefined) continue;
      const permKey = key as PermissionKey;
      if (!PERMISSION_KEYS.includes(permKey)) continue;

      if (permKey === 'canManageXP') {
        xpOverride = !!value;
        continue;
      }

      if (value) {
        overrideSet.add(permKey);
      } else {
        overrideSet.delete(permKey);
      }
    }

    const permissionsArray = Array.from(overrideSet).sort();

    const upsertPayload: Record<string, any> = {
      user_id: userId,
      permissions: permissionsArray,
    };

    if (xpOverride !== undefined) {
      upsertPayload.can_manage_xp = xpOverride;
    } else if (existingRow?.can_manage_xp !== null) {
      upsertPayload.can_manage_xp = existingRow?.can_manage_xp ?? false;
    }

    if (existingRow) {
      const updatePayload: Record<string, any> = {
        permissions: permissionsArray,
      };
      if (xpOverride !== undefined) {
        updatePayload.can_manage_xp = xpOverride;
      }

      const { error } = await supabaseAdmin
        .from('admin_permissions')
        .update(updatePayload)
        .eq('user_id', userId);

      if (error) {
        if (isMissingColumnError(error)) {
          return updateUserPermissionsLegacy(userId, partial);
        }
        console.error('Error updating admin_permissions:', error);
        return { success: false, error: 'Failed to update permissions.' };
      }
    } else {
      const insertPayload: Record<string, any> = {
        user_id: userId,
        permissions: permissionsArray,
      };
      if (xpOverride !== undefined) {
        insertPayload.can_manage_xp = xpOverride;
      }

      const { error } = await supabaseAdmin
        .from('admin_permissions')
        .insert(insertPayload);

      if (error) {
        if (isMissingColumnError(error)) {
          return updateUserPermissionsLegacy(userId, partial);
        }
        console.error('Error inserting admin_permissions:', error);
        return { success: false, error: 'Failed to update permissions.' };
      }
    }

    return { success: true };
  } catch (err: any) {
    if (isMissingColumnError(err)) {
      return updateUserPermissionsLegacy(userId, partial);
    }
    console.error('Unexpected error in updateUserPermissions:', err);
    return {
      success: false,
      error: err?.message || 'Unexpected error updating permissions.',
    };
  }
}

export async function userHasPermission(
  userId: string,
  role: UserRole,
  permission: PermissionKey,
): Promise<boolean> {
  if (role === 'Super Admin') return true;
  if (role === 'Member') return false;

  const perms = await getUserPermissions(userId, role);
  return !!perms[permission];
}

export async function hasGlobalPermission(
  user: { userId: string; role: UserRole | string },
  permission: PermissionKey,
): Promise<boolean> {
  const role =
    user.role === 'Super Admin' || user.role === 'Admin'
      ? user.role
      : 'Member';
  return userHasPermission(user.userId, role as UserRole, permission);
}
