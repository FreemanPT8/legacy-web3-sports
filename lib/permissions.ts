// lib/permissions.ts
import { supabaseAdmin } from './supabase';

export type UserRole = 'Super Admin' | 'Admin' | 'Member';

// 🔑 Todas as permissões globais que vamos gerir
export type PermissionKey =
  | 'canManageUsers'
  | 'canManageHouses'
  | 'canManageHeads'
  | 'canManageOnboarding'
  | 'canManageCourses'
  | 'canManageBlog'
  | 'canManageForum'
  | 'canManageXP'
  | 'canManageAnalytics'
  | 'canManageSettings';

// Alias para o frontend (page.tsx usa `type Permission`)
export type Permission = PermissionKey;

export const PERMISSION_KEYS: PermissionKey[] = [
  'canManageUsers',
  'canManageHouses',
  'canManageHeads',
  'canManageOnboarding',
  'canManageCourses',
  'canManageBlog',
  'canManageForum',
  'canManageXP',
  'canManageAnalytics',
  'canManageSettings',
];

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageHouses: boolean;
  canManageHeads: boolean;
  canManageOnboarding: boolean;
  canManageCourses: boolean;
  canManageBlog: boolean;
  canManageForum: boolean;
  canManageXP: boolean;
  canManageAnalytics: boolean;
  canManageSettings: boolean;
}

// 🔹 Labels amigáveis para o UI (Permissions page)
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canManageUsers: 'Manage Users',
  canManageHouses: 'Manage Houses of Sports',
  canManageHeads: 'Set / Manage Heads of House',
  canManageOnboarding: 'Manage Onboarding',
  canManageCourses: 'Manage Courses, Modules & Lessons',
  canManageBlog: 'Manage Blog Articles',
  canManageForum: 'Manage Forum (global moderation)',
  canManageXP: 'Manage XP (manual adjustments)',
  canManageAnalytics: 'View Analytics & Reports',
  canManageSettings: 'Manage Platform Settings',
};

// 🔹 Que permissões é que um Super Admin pode atribuir a Admins via UI
export const ADMIN_TOGGLABLE_PERMISSIONS: PermissionKey[] = [
  'canManageUsers',
  'canManageHouses',
  'canManageHeads',
  'canManageOnboarding',
  'canManageCourses',
  'canManageBlog',
  'canManageForum',
  'canManageXP',
  'canManageAnalytics',
  'canManageSettings',
];

// Defaults por role (objeto de flags)
const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  canManageUsers: true,
  canManageHouses: true,
  canManageHeads: true,
  canManageOnboarding: true,
  canManageCourses: true,
  canManageBlog: true,
  canManageForum: true,
  canManageXP: true,
  canManageAnalytics: true,
  canManageSettings: true,
};

const ADMIN_DEFAULT_PERMISSIONS: AdminPermissions = {
  canManageUsers: false,
  canManageHouses: false,
  canManageHeads: false,
  canManageOnboarding: false,
  canManageCourses: false,
  canManageBlog: false,
  canManageForum: false,
  canManageXP: false,
  canManageAnalytics: false,
  canManageSettings: false,
};

const MEMBER_PERMISSIONS: AdminPermissions = {
  canManageUsers: false,
  canManageHouses: false,
  canManageHeads: false,
  canManageOnboarding: false,
  canManageCourses: false,
  canManageBlog: false,
  canManageForum: false,
  canManageXP: false,
  canManageAnalytics: false,
  canManageSettings: false,
};

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, AdminPermissions> = {
  'Super Admin': SUPER_ADMIN_PERMISSIONS,
  Admin: ADMIN_DEFAULT_PERMISSIONS,
  Member: MEMBER_PERMISSIONS,
};

/**
 * ⚙️ Permissões base de um role em formato de flags booleanas.
 * (para lógica interna, userHasPermission, etc.)
 */
export function getRoleBasePermissions(role: UserRole): AdminPermissions {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] ?? MEMBER_PERMISSIONS;
}

/**
 * ⚙️ Versão "chaves ativas" — devolve só os PermissionKey em que o role tem true.
 * (isto é o que a API /admin/permissions vai usar como basePermissions)
 */
export function getRolePermissions(role: UserRole): PermissionKey[] {
  const base = getRoleBasePermissions(role);
  return PERMISSION_KEYS.filter((key) => base[key]);
}

// Mantemos este helper para compatibilidade
export function getDefaultPermissionsForRole(
  role: UserRole,
): AdminPermissions {
  return getRoleBasePermissions(role);
}

// Estrutura esperada em admin_permissions (se usarmos colunas por-permissão no futuro)
interface AdminPermissionsRow {
  id?: string;
  user_id: string;
  permissions: string[] | null;
  can_manage_xp: boolean | null;
}

// Converte row da BD + defaults do role em objeto AdminPermissions (flags)
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
    canManageForum: withOverrides('canManageForum', base.canManageForum),
    canManageXP: withOverrides('canManageXP', base.canManageXP),
    canManageAnalytics: withOverrides(
      'canManageAnalytics',
      base.canManageAnalytics,
    ),
    canManageSettings: withOverrides(
      'canManageSettings',
      base.canManageSettings,
    ),
  };
}

// 🔹 Lê permissões efetivas de um utilizador (role + overrides da BD, se existirem)
// Neste momento, se a tabela/admin columns não existirem, cai nos defaults e funciona.
export async function getUserPermissions(
  userId: string,
  role: UserRole,
): Promise<AdminPermissions> {
  // Se não houver supabaseAdmin (ex: falta env em dev), devolve defaults
  if (!supabaseAdmin) {
    return getRoleBasePermissions(role);
  }

  // Super Admin tem sempre tudo sem precisar de ir à BD
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
      console.error('Error loading admin_permissions for user:', error);
      return getRoleBasePermissions(role);
    }

    return mapRowToPermissions(
      (data as AdminPermissionsRow | null) ?? null,
      role,
    );
  } catch (err) {
    console.error('Unexpected error in getUserPermissions:', err);
    return getRoleBasePermissions(role);
  }
}

// 🔹 Atualiza / sobrescreve permissões de um Admin na tabela admin_permissions
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
        console.error('Error inserting admin_permissions:', error);
        return { success: false, error: 'Failed to update permissions.' };
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('Unexpected error in updateUserPermissions:', err);
    return {
      success: false,
      error: err?.message || 'Unexpected error updating permissions.',
    };
  }
}

// 🔹 Helper geral para rotas de API (sem o user object completo)
export async function userHasPermission(
  userId: string,
  role: UserRole,
  permission: PermissionKey,
): Promise<boolean> {
  // Super Admin tem sempre tudo
  if (role === 'Super Admin') return true;

  // Member não tem nenhuma permissão de admin
  if (role === 'Member') return false;

  const perms = await getUserPermissions(userId, role);
  return !!perms[permission];
}

// 🔹 Helper opcional (se quiseres passar o payload todo do JWT)
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
