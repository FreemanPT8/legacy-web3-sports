// lib/permissions.ts

/**
 * Permissões globais (nível plataforma).
 * Algumas serão "own" (só conteúdo do próprio) e outras "any".
 */
export type Permission =
  // Acesso ao painel
  | 'admin.access'

  // Houses of Sports
  | 'houses.create'
  | 'houses.set_head'

  // Utilizadores
  | 'users.manage_any'
  | 'users.manage_basic'
  | 'users.ban_any'

  // Onboarding
  | 'onboarding.manage_any'
  | 'onboarding.manage_house'

  // Cursos
  | 'courses.manage_any'
  | 'courses.manage_own'

  // Blog
  | 'blog.manage_any'
  | 'blog.manage_own'

  // Fórum
  | 'forum.manage_any' // fórum global
  | 'forum.manage_house' // apenas fórum da própria House

  // Houses (escopado por House)
  | 'house.moderators.manage'
  | 'house.permissions.manage'

  // XP
  | 'xp.manage'

  // Analytics
  | 'analytics.view';

/**
 * Permissões base por role.
 *
 * Super Admin tem tudo.
 * Admin começa com o mínimo e ganha o resto via admin_permissions.
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  'Super Admin': [
    'admin.access',

    'houses.create',
    'houses.set_head',

    'users.manage_any',
    'users.manage_basic',
    'users.ban_any',

    'onboarding.manage_any',

    'courses.manage_any',
    'blog.manage_any',

    'forum.manage_any',

    'house.moderators.manage',
    'house.permissions.manage',

    'xp.manage',
    'analytics.view',
  ],

  'Admin': [
    'admin.access',
    // Admin pode criar Houses por defeito (como já tinhas na API)
    'houses.create',
  ],

  // Members não têm permissões especiais
};

/**
 * Permissões escopadas à House de um Head of House.
 * Este “papel” é derivado (Admin + row em house_heads).
 */
export const HEAD_OF_HOUSE_PERMISSIONS: Permission[] = [
  'house.moderators.manage',
  'house.permissions.manage',
  'onboarding.manage_house',
  'forum.manage_house',
];

/**
 * Lista das permissões que podem ser geridas no Painel Admin.
 * (as outras são derivadas — ex: Head of House).
 */
export const ADMIN_TOGGLABLE_PERMISSIONS: Permission[] = [
  'houses.set_head',

  'users.manage_any',
  'users.manage_basic',
  'users.ban_any',

  'onboarding.manage_any',

  'courses.manage_any',
  'courses.manage_own',

  'blog.manage_any',
  'blog.manage_own',

  'forum.manage_any',

  'xp.manage',
  'analytics.view',
];

/**
 * Labels para mostrar na UI.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'admin.access': 'Access Admin Panel',

  'houses.create': 'Create Houses',
  'houses.set_head': 'Set Head of House',

  'users.manage_any': 'Manage all users',
  'users.manage_basic': 'Basic user management',
  'users.ban_any': 'Ban users',

  'onboarding.manage_any': 'Manage all onboarding',
  'onboarding.manage_house': 'Manage onboarding for own House',

  'courses.manage_any': 'Manage all courses',
  'courses.manage_own': 'Manage own courses only',

  'blog.manage_any': 'Manage all blog posts',
  'blog.manage_own': 'Manage own blog posts only',

  'forum.manage_any': 'Moderate global forum',
  'forum.manage_house': 'Moderate forum for own House',

  'house.moderators.manage': 'Manage House moderators',
  'house.permissions.manage': 'Manage House permissions',

  'xp.manage': 'Manage XP',
  'analytics.view': 'View analytics',
};

/**
 * Permissões base por role.
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
}

/**
 * Verifica se um role + lista extra têm uma permissão global.
 */
export function hasGlobalPermission(
  role: string,
  permission: Permission,
  extra?: Permission[],
): boolean {
  // Super Admin manda em tudo
  if (role === 'Super Admin') return true;

  const base = getRolePermissions(role);
  if (base.includes(permission)) return true;

  if (extra && extra.includes(permission)) return true;

  return false;
}

/**
 * Verifica permissões ao nível de uma House específica.
 */
export function hasHouseScopedPermission(options: {
  role: string;
  isHeadOfThisHouse: boolean;
  permission: Permission;
}): boolean {
  const { role, isHeadOfThisHouse, permission } = options;

  if (role === 'Super Admin') return true;

  if (role === 'Admin' && isHeadOfThisHouse) {
    if (HEAD_OF_HOUSE_PERMISSIONS.includes(permission)) {
      return true;
    }
  }

  // Se não for Head ou Super Admin, cai nas permissões globais
  return hasGlobalPermission(role, permission);
}
