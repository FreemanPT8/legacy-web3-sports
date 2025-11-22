// lib/permissions.ts
import { supabaseAdmin } from './supabase';

export type UserRole = 'Super Admin' | 'Admin' | 'Member';

// 🔑 Todas as permissões que vamos gerir (podes acrescentar mais no futuro)
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

// Defaults por role
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

export function getDefaultPermissionsForRole(
  role: UserRole,
): AdminPermissions {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] || MEMBER_PERMISSIONS;
}

// Estrutura esperada em admin_permissions
interface AdminPermissionsRow {
  id: string;
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

// Converte row da BD + defaults do role em objeto AdminPermissions
function mapRowToPermissions(
  row: AdminPermissionsRow | null,
  role: UserRole,
): AdminPermissions {
  const base = getDefaultPermissionsForRole(role);

  if (!row) return { ...base };

  return {
    canManageUsers:
      row.can_manage_users ?? base.canManageUsers,
    canManageHouses:
      row.can_manage_houses ?? base.canManageHouses,
    canManageHeads:
      row.can_manage_heads ?? base.canManageHeads,
    canManageOnboarding:
      row.can_manage_onboarding ?? base.canManageOnboarding,
    canManageCourses:
      row.can_manage_courses ?? base.canManageCourses,
    canManageBlog:
      row.can_manage_blog ?? base.canManageBlog,
    canManageForum:
      row.can_manage_forum ?? base.canManageForum,
    canManageXP:
      row.can_manage_xp ?? base.canManageXP,
    canManageAnalytics:
      row.can_manage_analytics ?? base.canManageAnalytics,
    canManageSettings:
      row.can_manage_settings ?? base.canManageSettings,
  };
}

// Helpers internos: camelCase → snake_case para guardar na BD
function camelToSnake(key: PermissionKey): string {
  switch (key) {
    case 'canManageUsers':
      return 'can_manage_users';
    case 'canManageHouses':
      return 'can_manage_houses';
    case 'canManageHeads':
      return 'can_manage_heads';
    case 'canManageOnboarding':
      return 'can_manage_onboarding';
    case 'canManageCourses':
      return 'can_manage_courses';
    case 'canManageBlog':
      return 'can_manage_blog';
    case 'canManageForum':
      return 'can_manage_forum';
    case 'canManageXP':
      return 'can_manage_xp';
    case 'canManageAnalytics':
      return 'can_manage_analytics';
    case 'canManageSettings':
      return 'can_manage_settings';
    default:
      return key;
  }
}

// 🔹 Lê permissões efetivas de um utilizador (role + overrides da BD)
export async function getUserPermissions(
  userId: string,
  role: UserRole,
): Promise<AdminPermissions> {
  // Se não houver supabaseAdmin (ex: falta env em dev), devolve defaults
  if (!supabaseAdmin) {
    return getDefaultPermissionsForRole(role);
  }

  if (role === 'Super Admin') {
    return SUPER_ADMIN_PERMISSIONS;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_permissions')
      .select(
        'id, user_id, can_manage_users, can_manage_houses, can_manage_heads, can_manage_onboarding, can_manage_courses, can_manage_blog, can_manage_forum, can_manage_xp, can_manage_analytics, can_manage_settings',
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error loading admin_permissions for user:', error);
      return getDefaultPermissionsForRole(role);
    }

    return mapRowToPermissions(
      (data as AdminPermissionsRow | null) ?? null,
      role,
    );
  } catch (err) {
    console.error('Unexpected error in getUserPermissions:', err);
    return getDefaultPermissionsForRole(role);
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
    // Transformar partial { canManageUsers: true } em campos snake_case
    const updatePayload: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(partial)) {
      if (value === undefined) continue;
      const camelKey = key as PermissionKey;
      if (!PERMISSION_KEYS.includes(camelKey)) continue;
      const col = camelToSnake(camelKey);
      updatePayload[col] = !!value;
    }

    if (Object.keys(updatePayload).length === 0) {
      return { success: true };
    }

    // upsert por user_id
    const { error } = await supabaseAdmin
      .from('admin_permissions')
      .upsert(
        {
          user_id: userId,
          ...updatePayload,
        },
        { onConflict: 'user_id' },
      );

    if (error) {
      console.error('Error updating admin_permissions:', error);
      return { success: false, error: 'Failed to update permissions.' };
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

// 🔹 Helper usado pelas rotas de API: verifica se um user tem uma permissão
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
