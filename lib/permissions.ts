// lib/permissions.ts

/**
 * Permissões globais (nível plataforma).
 * Algumas são "all" (qualquer conteúdo),
 * outras são "own" (só conteúdo criado pelo próprio).
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
  | 'forum.manage_house' // fórum só da própria House

  // Houses (escopado por House, mas controlado via painel)
  | 'house.moderators.manage'
  | 'house.permissions.manage'

  // XP
  | 'xp.manage'

  // Analytics
  | 'analytics.view';

/**
 * Permissões por "role" base (sem overrides).
 *
 * - Super Admin tem TUDO.
 * - Admin tem apenas o mínimo por omissão; o resto será dado via overrides.
 * - Head of House NÃO é um role separado na tabela users:
 *   é um Admin que é Head numa House (house_heads), e ganha poderes *por House*.
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

    // house-level, mas Super Admin pode tudo
    'house.moderators.manage',
    'house.permissions.manage',

    'xp.manage',
    'analytics.view',
  ],

  'Admin': [
    'admin.access',

    // Admin pode criar Houses (como já tinhas na API)
    'houses.create',

    // O resto vem *apenas* se o Super Admin der permissão explícita:
    // users.manage_basic, onboarding.manage_any, etc.
    // Mantemos aqui só o que é garantido por omissão.
  ],

  // Se em algum momento quiseres ter um role "Head" separado:
  // 'Head': ['admin.access', 'house.moderators.manage', 'house.permissions.manage', 'forum.manage_house']
};

/**
 * Permissões "base" de um Head of House.
 * Isto é escopado por House: só vale para a House onde é Head.
 */
export const HEAD_OF_HOUSE_PERMISSIONS: Permission[] = [
  'house.moderators.manage',
  'house.permissions.manage',
  'onboarding.manage_house',
  'forum.manage_house',
];

/**
 * Devolve as permissões base de um role.
 */
export function getRolePermissions(role: string): Permission[] {
  return ROLE_DEFAULT_PERMISSIONS[role] ?? [];
}

/**
 * Verifica se um role tem uma permissão global
 * (sem ter em conta overrides por utilizador).
 */
export function hasGlobalPermission(
  role: string,
  permission: Permission,
): boolean {
  if (role === 'Super Admin') return true;
  const base = getRolePermissions(role);
  return base.includes(permission);
}

/**
 * Verifica permissões ao nível de uma House específica.
 *
 * - Super Admin: pode sempre.
 * - Admin que é Head dessa House: tem HEAD_OF_HOUSE_PERMISSIONS.
 * - Depois podemos acrescentar aqui permissões vindas de uma tabela
 *   house_permissions se quiseres granularidade por utilizador.
 */
export function hasHouseScopedPermission(options: {
  role: string;
  isHeadOfThisHouse: boolean;
  permission: Permission;
}): boolean {
  const { role, isHeadOfThisHouse, permission } = options;

  // Super Admin manda em tudo
  if (role === 'Super Admin') return true;

  // Head of House (tem de ser Admin) tem powers específicos nessa House
  if (role === 'Admin' && isHeadOfThisHouse) {
    if (HEAD_OF_HOUSE_PERMISSIONS.includes(permission)) {
      return true;
    }
  }

  // Caso contrário, recai só nos poderes globais do role
  return hasGlobalPermission(role, permission);
}
