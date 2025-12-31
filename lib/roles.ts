import type { UserRole } from './permissions';

const ROLE_ALIASES: Record<string, UserRole> = {
  admin: 'Admin',
  administrator: 'Admin',
  'super admin': 'Super Admin',
  'super administrator': 'Super Admin',
  superadministrator: 'Super Admin',
  superadmin: 'Super Admin',
  member: 'Member',
  user: 'Member',
};

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
  return ROLE_ALIASES[normalized] ?? null;
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
