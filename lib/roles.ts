import type { UserRole } from './permissions';

const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'Admin',
  administrador: 'Admin',
  administradora: 'Admin',
  administrator: 'Admin',
  administrateur: 'Admin',
  administradorao: 'Admin',
  'legacy admin': 'Admin',
  'admin legacy': 'Admin',
  'super admin': 'Super Admin',
  'super administrador': 'Super Admin',
  'super administradora': 'Super Admin',
  'super administrator': 'Super Admin',
  superadministrator: 'Super Admin',
  superadministrador: 'Super Admin',
  superadministradora: 'Super Admin',
  superadmin: 'Super Admin',
  'head admin': 'Super Admin',
  member: 'Member',
  membro: 'Member',
  miembro: 'Member',
  usuario: 'Member',
  user: 'Member',
};

const KEYWORD_FALLBACKS: Array<{ match: (normalized: string) => boolean; role: UserRole }> = [
  {
    role: 'Super Admin',
    match: (key) => key.includes('super') && key.includes('admin'),
  },
  {
    role: 'Admin',
    match: (key) =>
      key.includes('admin') ||
      key.includes('adm.') ||
      key.includes('administr') ||
      key.includes('moderador chefe'),
  },
  {
    role: 'Member',
    match: (key) =>
      key.includes('member') ||
      key.includes('membro') ||
      key.includes('miembro') ||
      key.includes('usuario') ||
      key.includes('user'),
  },
];

function normalizeKey(role: string): string {
  return role
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function normalizeUserRole(role?: string | null): UserRole | null {
  if (!role || typeof role !== 'string') {
    return null;
  }
  const normalized = normalizeKey(role);
  if (ROLE_ALIASES[normalized]) {
    return ROLE_ALIASES[normalized];
  }

  const fallback = KEYWORD_FALLBACKS.find(({ match }) => match(normalized));
  return fallback?.role ?? null;
}

export function ensureUserRole(
  role?: string | null,
  fallback: UserRole = 'Member',
): UserRole {
  return normalizeUserRole(role) ?? fallback;
}

export function isAdminRole(role?: string | null): boolean {
  const normalized = normalizeUserRole(role);
  return normalized === 'Admin' || normalized === 'Super Admin';
}

export function isSuperAdminRole(role?: string | null): boolean {
  return normalizeUserRole(role) === 'Super Admin';
}

export function withCanonicalUserRole<T extends { role?: string | null }>(
  user: T,
  fallback: UserRole = 'Member',
): T & { role: UserRole } {
  const canonicalRole = ensureUserRole(user.role, fallback);
  return { ...user, role: canonicalRole };
}
