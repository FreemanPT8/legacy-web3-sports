// Shared permission helpers (no Supabase imports so they can be used on client + server)

export type UserRole = 'Super Admin' | 'Admin' | 'Member';

export type PermissionKey =
  | 'canManageUsers'
  | 'canManageHouses'
  | 'canManageHeads'
  | 'canManageOnboarding'
  | 'canManageCourses'
  | 'canManageBlog'
  | 'canManageXP'
  | 'canManageAnalytics'
  | 'canManageSettings'
  | 'canCreateSports';

export type Permission = PermissionKey;

export const PERMISSION_KEYS: PermissionKey[] = [
  'canManageUsers',
  'canManageHouses',
  'canManageHeads',
  'canManageOnboarding',
  'canManageCourses',
  'canManageBlog',
  'canManageXP',
  'canManageAnalytics',
  'canManageSettings',
  'canCreateSports',
];

export interface AdminPermissions {
  canManageUsers: boolean;
  canManageHouses: boolean;
  canManageHeads: boolean;
  canManageOnboarding: boolean;
  canManageCourses: boolean;
  canManageBlog: boolean;
  canManageXP: boolean;
  canManageAnalytics: boolean;
  canManageSettings: boolean;
  canCreateSports: boolean;
}

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  canManageUsers: 'Manage Users',
  canManageHouses: 'Manage Houses of Sports',
  canManageHeads: 'Set / Manage Heads of House',
  canManageOnboarding: 'Manage Onboarding',
  canManageCourses: 'Manage Courses & Curriculum',
  canManageBlog: 'Manage Blog Articles',
  canManageXP: 'Manage XP (manual adjustments)',
  canManageAnalytics: 'View Analytics & Reports',
  canManageSettings: 'Manage Platform Settings',
  canCreateSports: 'Create new sports',
};

export const ADMIN_TOGGLABLE_PERMISSIONS: PermissionKey[] = [...PERMISSION_KEYS];

export const SUPER_ADMIN_PERMISSIONS: AdminPermissions = {
  canManageUsers: true,
  canManageHouses: true,
  canManageHeads: true,
  canManageOnboarding: true,
  canManageCourses: true,
  canManageBlog: true,
  canManageXP: true,
  canManageAnalytics: true,
  canManageSettings: true,
  canCreateSports: true,
};

const ADMIN_DEFAULT_PERMISSIONS: AdminPermissions = {
  canManageUsers: false,
  canManageHouses: false,
  canManageHeads: false,
  canManageOnboarding: false,
  canManageCourses: false,
  canManageBlog: false,
  canManageXP: false,
  canManageAnalytics: false,
  canManageSettings: false,
  canCreateSports: false,
};

const MEMBER_PERMISSIONS: AdminPermissions = {
  canManageUsers: false,
  canManageHouses: false,
  canManageHeads: false,
  canManageOnboarding: false,
  canManageCourses: false,
  canManageBlog: false,
  canManageXP: false,
  canManageAnalytics: false,
  canManageSettings: false,
  canCreateSports: false,
};

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, AdminPermissions> = {
  'Super Admin': SUPER_ADMIN_PERMISSIONS,
  Admin: ADMIN_DEFAULT_PERMISSIONS,
  Member: MEMBER_PERMISSIONS,
};

export function getRoleBasePermissions(role: UserRole): AdminPermissions {
  return DEFAULT_PERMISSIONS_BY_ROLE[role] ?? MEMBER_PERMISSIONS;
}

export function getRolePermissions(role: UserRole): PermissionKey[] {
  const base = getRoleBasePermissions(role);
  return PERMISSION_KEYS.filter((key) => base[key]);
}

export function getDefaultPermissionsForRole(role: UserRole): AdminPermissions {
  return getRoleBasePermissions(role);
}
