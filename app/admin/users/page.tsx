// app/admin/users/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  type PermissionKey,
  ADMIN_TOGGLABLE_PERMISSIONS,
  PERMISSION_LABELS,
} from '@/lib/permissions';

type UserRole = 'Super Admin' | 'Admin' | 'Member';

type AdminUser = {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: UserRole | string;
  country: string | null;
  xp_total: number;
  created_at: string | null;
  last_login: string | null;
  sports_role: string | null;
  last_xp_at: string | null;
};

type SortKey =
  | 'username'
  | 'full_name'
  | 'email'
  | 'role'
  | 'country'
  | 'xp_total'
  | 'created_at'
  | 'last_login'
  | 'last_xp_at';
type SortDirection = 'asc' | 'desc';

type PermissionsResponse = {
  success: boolean;
  error?: string;
  userId?: string;
  role?: UserRole;
  permissions?: {
    [K in PermissionKey]?: boolean;
  };
  editable?: boolean;
};

type PermissionsListResponse = {
  success: boolean;
  users?: AdminUser[];
  error?: string;
};

type PermissionsSummaryResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageUsers?: boolean;
    [key: string]: any;
  };
};

type StatsUsers = {
  total: number;
  superAdmins: number;
  admins: number;
  members: number;
  new24h: number;
  new30d: number;
};

type SportPermissionAdmin = {
  id: string;
  displayName: string;
  username: string | null;
  role: 'Admin' | 'Super Admin';
  hasPermission: boolean;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('prefill') ?? '');
  const [roleFilters, setRoleFilters] = useState<UserRole[]>([
    'Super Admin',
    'Admin',
    'Member',
  ]);
  const [countryFilters, setCountryFilters] = useState<string[]>([]);
  const [sportFilters, setSportFilters] = useState<string[]>([]);
  const [lastLoginFilter, setLastLoginFilter] = useState<
    'any' | 'last7d' | 'last30d' | 'never'
  >('any');
  const [lastXpFilter, setLastXpFilter] = useState<
    'any' | 'last7d' | 'last30d' | 'never'
  >('any');
  const [showFilters, setShowFilters] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [canManageUsers, setCanManageUsers] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedUserRole, setSelectedUserRole] = useState<UserRole | null>(
    null,
  );
  const [selectedUserPermissions, setSelectedUserPermissions] = useState<
    Partial<Record<PermissionKey, boolean>>
  >({});
  const [permissionsEditable, setPermissionsEditable] = useState(false);
  const [loadingUserPermissions, setLoadingUserPermissions] = useState(false);
  const [savingUserPermissions, setSavingUserPermissions] = useState(false);
  const [userStats, setUserStats] = useState<StatsUsers | null>(null);
  const [sportPermissionAdmins, setSportPermissionAdmins] = useState<SportPermissionAdmin[]>([]);
  const [loadingSportAdmins, setLoadingSportAdmins] = useState(false);
  const [updatingSportAdminId, setUpdatingSportAdminId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  const loadSportPermissionAdmins = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoadingSportAdmins(true);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch('/api/admin/permissions', { headers });
      const data = await response.json();
      if (!response.ok || !data?.success || !Array.isArray(data.admins)) {
        throw new Error(data?.error || 'Failed to load admin permissions list.');
      }

      const rows: SportPermissionAdmin[] = (data.admins as any[])
        .filter((admin) => admin.role === 'Super Admin' || admin.role === 'Admin')
        .map((admin) => {
          const effective = new Set<string>([
            ...(admin.basePermissions || []),
            ...(admin.extraPermissions || []),
          ]);
          const displayName = admin.full_name || admin.username || admin.email || 'Admin';
          return {
            id: admin.id,
            displayName,
            username: admin.username,
            role: admin.role,
            hasPermission: effective.has('canCreateSports'),
          } as SportPermissionAdmin;
        })
        .sort((a, b) => {
          if (a.role === b.role) {
            return a.displayName.localeCompare(b.displayName);
          }
          return a.role === 'Super Admin' ? -1 : 1;
        });

      setSportPermissionAdmins(rows);
    } catch (err) {
      console.error('Error loading sport permission admins:', err);
      toast({
        title: 'Erro ao carregar permissões',
        description:
          err instanceof Error ? err.message : 'Não foi possível carregar a lista de admins.',
        variant: 'destructive',
      });
    } finally {
      setLoadingSportAdmins(false);
    }
  }, [getToken, isSuperAdmin, toast]);

  // Protecao basica
  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'Super Admin' && user.role !== 'Admin') {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  // Permissoes do utilizador atual
  useEffect(() => {
    if (loading || !user) return;

    if (user.role === 'Super Admin') {
      setCanManageUsers(true);
      setPermissionsLoaded(true);
      return;
    }

    const fetchPermissions = async () => {
      try {
        const token = getToken();
        const res = await fetch('/api/admin/permissions', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PermissionsSummaryResponse = await res.json();

        if (!res.ok || !data.success || !data.permissions) {
          console.error('Error loading permissions for current user:', data);
          setCanManageUsers(false);
          setPermissionsLoaded(true);
          return;
        }

        setCanManageUsers(!!data.permissions.canManageUsers);
        setPermissionsLoaded(true);
      } catch (err) {
        console.error('Unexpected error fetching permissions:', err);
        setCanManageUsers(false);
        setPermissionsLoaded(true);
      }
    };

    fetchPermissions();
  }, [user, loading, getToken]);

  // Lista de utilizadores
  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoadingUsers(true);
      try {
        const token = getToken();
        const res = await fetch('/api/admin/users', {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });

        const data: PermissionsListResponse = await res.json();

        if (!res.ok || !data.success) {
          console.error('Error fetching admin users:', data);
          toast({
            title: 'Error loading users',
            description: data.error || 'Failed to load users list.',
            variant: 'destructive',
          });
          setUsers([]);
          return;
        }

        setUsers(data.users || []);
      } catch (err) {
        console.error('Unexpected error fetching admin users:', err);
        toast({
          title: 'Network error',
          description: 'Could not load users. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingUsers(false);
      }
    };

    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchUsers();
    }
  }, [user, getToken, toast]);

  // Stats rapidas (vem de /api/admin/stats -> users block)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = getToken();
        const headers: HeadersInit = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const res = await fetch('/api/admin/stats', { headers });
        const data = await res.json();
        if (!res.ok || !data.success || !data.stats?.users) return;
        const u = data.stats.users;
        setUserStats({
          total: u.total ?? 0,
          superAdmins: u.superAdmins ?? 0,
          admins: u.admins ?? 0,
          members: u.members ?? 0,
          new24h: u.new24h ?? 0,
          new30d: u.new30d ?? 0,
        });
      } catch (err) {
        console.error('Error loading user stats:', err);
      }
    };
    if (user && (user.role === 'Super Admin' || user.role === 'Admin')) {
      fetchStats();
    }
  }, [user, getToken]);

  useEffect(() => {
    if (isSuperAdmin) {
      loadSportPermissionAdmins();
    }
  }, [isSuperAdmin, loadSportPermissionAdmins]);

  // Opcoes de filtros (pais e desporto)
  const countryOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.country) set.add(u.country);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const sportOptions = useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => {
      if (u.sports_role) set.add(u.sports_role);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [users]);

  const handleToggleAdminSportPermission = async (adminId: string, enabled: boolean) => {
    setUpdatingSportAdminId(adminId);
    try {
      const token = getToken();
      const headers: HeadersInit = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(`/api/admin/users/${adminId}/permissions`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ permissions: { canCreateSports: enabled } }),
      });
      const data = await response.json();
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Não foi possível atualizar a permissão.');
      }

      toast({
        title: 'Permissões atualizadas',
        description: enabled
          ? 'Este Admin pode agora criar novos desportos.'
          : 'Permissão removida com sucesso.',
      });
      await loadSportPermissionAdmins();
    } catch (err) {
      console.error('Erro ao atualizar permissão de desporto:', err);
      toast({
        title: 'Erro ao atualizar permissão',
        description: err instanceof Error ? err.message : 'Não foi possível atualizar esta permissão.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingSportAdminId(null);
    }
  };

  // Filtrar e ordenar
  const filteredAndSortedUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = [...users];

    if (term) {
      list = list.filter((u) => {
        const username = u.username?.toLowerCase() ?? '';
        const name = u.full_name?.toLowerCase() ?? '';
        const email = u.email?.toLowerCase() ?? '';
        return (
          username.includes(term) ||
          name.includes(term) ||
          email.includes(term)
        );
      });
    }

    if (roleFilters.length > 0) {
      list = list.filter((u) => roleFilters.includes(u.role as UserRole));
    }

    if (countryFilters.length > 0) {
      list = list.filter(
        (u) => u.country && countryFilters.includes(u.country),
      );
    }

    if (sportFilters.length > 0) {
      list = list.filter(
        (u) => u.sports_role && sportFilters.includes(u.sports_role),
      );
    }

    const now = Date.now();
    const since = (days: number) => now - days * 24 * 60 * 60 * 1000;

    if (lastLoginFilter !== 'any') {
      list = list.filter((u) => {
        const ts = u.last_login ? new Date(u.last_login).getTime() : 0;
        if (lastLoginFilter === 'never') return !ts;
        if (!ts) return false;
        if (lastLoginFilter === 'last7d') return ts >= since(7);
        if (lastLoginFilter === 'last30d') return ts >= since(30);
        return true;
      });
    }

    if (lastXpFilter !== 'any') {
      list = list.filter((u) => {
        const ts = u.last_xp_at ? new Date(u.last_xp_at).getTime() : 0;
        if (lastXpFilter === 'never') return !ts;
        if (!ts) return false;
        if (lastXpFilter === 'last7d') return ts >= since(7);
        if (lastXpFilter === 'last30d') return ts >= since(30);
        return true;
      });
    }

    list.sort((a, b) => {
      let valA: string | number = '';
      let valB: string | number = '';

      switch (sortKey) {
        case 'username':
          valA = a.username?.toLowerCase() ?? '';
          valB = b.username?.toLowerCase() ?? '';
          break;
        case 'full_name':
          valA = a.full_name?.toLowerCase() ?? '';
          valB = b.full_name?.toLowerCase() ?? '';
          break;
        case 'email':
          valA = a.email?.toLowerCase() ?? '';
          valB = b.email?.toLowerCase() ?? '';
          break;
        case 'role':
          valA = (a.role || '').toString().toLowerCase();
          valB = (b.role || '').toString().toLowerCase();
          break;
        case 'country':
          valA = a.country?.toLowerCase() ?? '';
          valB = b.country?.toLowerCase() ?? '';
          break;
        case 'xp_total':
          valA = a.xp_total ?? 0;
          valB = b.xp_total ?? 0;
          break;
        case 'last_login':
          valA = a.last_login ? new Date(a.last_login).getTime() : 0;
          valB = b.last_login ? new Date(b.last_login).getTime() : 0;
          break;
        case 'last_xp_at':
          valA = a.last_xp_at ? new Date(a.last_xp_at).getTime() : 0;
          valB = b.last_xp_at ? new Date(b.last_xp_at).getTime() : 0;
          break;
        case 'created_at':
        default:
          valA = a.created_at ? new Date(a.created_at).getTime() : 0;
          valB = b.created_at ? new Date(b.created_at).getTime() : 0;
          break;
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }

      const strA = String(valA);
      const strB = String(valB);
      const result = strA.localeCompare(strB);
      return sortDirection === 'asc' ? result : -result;
    });

    return list;
  }, [
    users,
    search,
    roleFilters,
    countryFilters,
    sportFilters,
    lastLoginFilter,
    lastXpFilter,
    sortKey,
    sortDirection,
  ]);

  const statsLocal = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === 'Super Admin').length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const members = users.filter((u) => u.role === 'Member').length;
    return { total, superAdmins, admins, members };
  }, [users]);

  const statsDisplay = (primary?: number | null, fallback?: number) => {
    const value = primary ?? fallback ?? 0;
    return value.toLocaleString();
  };

  const metricCards = useMemo(
    () => [
      {
        label: 'TOTAL USERS',
        value: statsDisplay(userStats?.total, statsLocal.total),
        description: 'Utilizadores registados',
      },
      {
        label: 'SUPER ADMINS',
        value: statsDisplay(userStats?.superAdmins, statsLocal.superAdmins),
        description: 'Contas com acesso total',
      },
      {
        label: 'ADMINS',
        value: statsDisplay(userStats?.admins, statsLocal.admins),
        description: 'Admins ativos',
      },
      {
        label: 'MEMBERS',
        value: statsDisplay(userStats?.members, statsLocal.members),
        description: 'Membros base',
      },
      {
        label: 'NOVOS 24H',
        value: statsDisplay(userStats?.new24h, 0),
        description: 'Entradas nas ultimas 24h',
      },
      {
        label: 'NOVOS 30D',
        value: statsDisplay(userStats?.new30d, 0),
        description: 'Entradas nos ultimos 30 dias',
      },
    ],
    [statsLocal, userStats],
  );

  const canEditUsers = canManageUsers;

  const handleOpenUserPermissions = async (userRow: AdminUser) => {
    setSelectedUser(userRow);
    setSelectedUserRole(
      userRow.role === 'Super Admin' || userRow.role === 'Admin'
        ? (userRow.role as UserRole)
        : 'Member',
    );
    setSelectedUserPermissions({});
    setPermissionsEditable(false);
    setLoadingUserPermissions(true);

    try {
      const token = getToken();
      const res = await fetch(`/api/admin/users/${userRow.id}/permissions`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data: PermissionsResponse = await res.json();

      if (!res.ok || !data.success || !data.permissions) {
        console.error('Error loading user permissions:', data);
        toast({
          title: 'Error loading permissions',
          description:
            data.error || 'Could not load permissions for this user.',
          variant: 'destructive',
        });
        setLoadingUserPermissions(false);
        return;
      }

      setSelectedUserRole(data.role || null);

      const perms: Partial<Record<PermissionKey, boolean>> = {};
      for (const key of ADMIN_TOGGLABLE_PERMISSIONS) {
        perms[key] = !!data.permissions[key];
      }

      setSelectedUserPermissions(perms);
      setPermissionsEditable(!!data.editable);
    } catch (err) {
      console.error('Unexpected error fetching user permissions:', err);
      toast({
        title: 'Network error',
        description: 'Could not load user permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoadingUserPermissions(false);
    }
  };

  const handleTogglePermission = (key: PermissionKey, value: boolean) => {
    setSelectedUserPermissions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveUserPermissions = async () => {
    if (!selectedUser || !selectedUserRole) return;

    if (!canEditUsers) {
      toast({
        title: 'Not allowed',
        description:
          'You do not have permission to update admin extra permissions.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedUserRole !== 'Admin') {
      toast({
        title: 'Not allowed',
        description:
          'Extra admin permissions can only be set for Admin users.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingUserPermissions(true);
      const token = getToken();

      const res = await fetch(
        `/api/admin/users/${selectedUser.id}/permissions`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            permissions: selectedUserPermissions,
          }),
        },
      );

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error saving permissions',
          description: data.error || 'Could not update user permissions.',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Permissions updated',
        description: 'User admin permissions have been updated successfully.',
      });
    } catch (err) {
      console.error('Error updating user permissions:', err);
      toast({
        title: 'Network error',
        description: 'Could not update permissions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSavingUserPermissions(false);
    }
  };

  const handleChangeRole = async (
    userId: string,
    newRole: UserRole,
    currentRole: UserRole | string,
  ) => {
    if (!canEditUsers) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage users.',
        variant: 'destructive',
      });
      return;
    }

    if (
      !isSuperAdmin &&
      (currentRole === 'Super Admin' || newRole === 'Super Admin')
    ) {
      toast({
        title: 'Not allowed',
        description: 'Only Super Admin can change Super Admin roles.',
        variant: 'destructive',
      });
      return;
    }

    if (user && user.id === userId && newRole !== 'Super Admin') {
      toast({
        title: 'Operation not allowed',
        description: "You can't remove your own Super Admin role.",
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdatingUserId(userId);
      const token = getToken();

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error updating role',
          description: data.error || 'Could not update user role.',
          variant: 'destructive',
        });
        return;
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)),
      );

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser({ ...selectedUser, role: newRole });
        setSelectedUserRole(newRole);
      }

      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully.',
      });
    } catch (err) {
      console.error('Error updating user role:', err);
      toast({
        title: 'Network error',
        description: 'Could not update role. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, username: string | null) => {
    if (!canEditUsers) {
      toast({
        title: 'Not allowed',
        description: 'You do not have permission to manage users.',
        variant: 'destructive',
      });
      return;
    }

    if (!isSuperAdmin) {
      toast({
        title: 'Not allowed',
        description: 'Only Super Admin can delete users.',
        variant: 'destructive',
      });
      return;
    }

    if (user && user.id === userId) {
      toast({
        title: 'Operation not allowed',
        description: "You can't delete your own account from here.",
        variant: 'destructive',
      });
      return;
    }

    const confirmation = window.prompt(
      `Type "delete" to permanently remove user "${
        username || userId
      }". This action cannot be undone.`,
    );

    if (confirmation !== 'delete') {
      toast({
        title: 'Deletion cancelled',
        description: 'User was not deleted.',
      });
      return;
    }

    try {
      setDeletingUserId(userId);
      const token = getToken();

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        toast({
          title: 'Error deleting user',
          description: data.error || 'Could not delete user.',
          variant: 'destructive',
        });
        return;
      }

      setUsers((prev) => prev.filter((u) => u.id !== userId));

      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(null);
        setSelectedUserRole(null);
        setSelectedUserPermissions({});
      }

      toast({
        title: 'User deleted',
        description: `User "${username || userId}" has been removed.`,
      });
    } catch (err) {
      console.error('Error deleting user:', err);
      toast({
        title: 'Network error',
        description: 'Could not delete user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingUserId(null);
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    if (role === 'Super Admin') {
      return 'border border-rose-400/70 bg-rose-500/10 text-rose-200';
    }
    if (role === 'Admin') {
      return 'border border-cyan-400/60 bg-cyan-400/10 text-cyan-200';
    }
    return 'border border-white/10 bg-white/5 text-slate-200';
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-500" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="ml-1 h-3 w-3 text-cyan-300" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-cyan-300" />
    );
  };

  const toggleArrayFilter = (current: string[], value: string): string[] => {
    if (current.includes(value)) {
      return current.filter((v) => v !== value);
    }
    return [...current, value];
  };

  const activeFilterButtonClasses =
    'bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_12px_35px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]';
  const inactiveFilterButtonClasses =
    'border-white/40 text-white hover:bg-white/10';

  if (loading || !permissionsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#020b16] via-[#00141f] to-[#000c12] text-white">
        <p className="text-sm text-slate-200">A carregar utilizadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full space-y-8 bg-gradient-to-b from-[#020b16] via-[#00141f] to-[#000c12] px-4 py-6 text-white md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-[#020b16] via-[#00141f] to-[#021c27] px-6 py-10 shadow-[0_35px_90px_rgba(3,10,25,0.65)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-[#5af3ff]/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-[#fdd87c]/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl space-y-4">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-200">
            LEGACY ADMIN - USERS
          </p>

          <h1 className="text-3xl font-semibold text-[#fdd87c] md:text-4xl">
            User Management
          </h1>
          <p className="text-sm text-slate-100 md:text-base">
            Gestao centralizada de roles, permissoes e filtros de utilizadores
            por pais, desporto, atividade recente e XP. A sala de controlo da
            comunidade LEGACY.
          </p>
        </div>
      </section>

      {/* CONTEUDO */}
      <section className="pb-2">
        <div className="mx-auto max-w-6xl space-y-6">
          {/* STAT CARDS */}
          <div className="mb-2 grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {metricCards.map((metric) => (
              <Card
                key={metric.label}
                className="border border-white/10 bg-[#04131b] p-5 shadow-[0_20px_60px_rgba(3,10,25,0.55)]"
              >
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#fdd87c]">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-200">
                  {metric.description}
                </p>
              </Card>
            ))}
          </div>

          {/* USER MANAGEMENT */}
          <Card className="border border-white/10 bg-[#04131b] shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
            <CardHeader>
              <CardTitle className="text-[#fdd87c]">User Management</CardTitle>
              <p className="text-sm text-slate-200">
                Filtros avancados por role, pais, desporto, ultimo login e
                ultimo XP.
              </p>
            </CardHeader>
            <CardContent className="text-slate-200">
              <div className="mb-4 flex flex-col gap-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search by username, name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="max-w-md border-white/20 bg-[#021824]/80 text-white placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSearch('')}
                      disabled={!search}
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters((p) => !p)}
                      className="border-white/40 text-white hover:bg-white/10"
                    >
                      {showFilters ? 'Esconder filtros' : 'Procurar por filtros'}
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="space-y-4 rounded-lg border border-white/10 bg-[#021824]/70 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200">
                          Last login:
                        </span>
                        <Select
                          value={lastLoginFilter}
                          onValueChange={(v) =>
                            setLastLoginFilter(v as typeof lastLoginFilter)
                          }
                        >
                          <SelectTrigger className="w-[150px] border-white/10 bg-[#04131b] text-white focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="last7d">
                              Ultimos 7 dias
                            </SelectItem>
                            <SelectItem value="last30d">
                              Ultimos 30 dias
                            </SelectItem>
                            <SelectItem value="never">Nunca</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-200">
                          Ultimo XP:
                        </span>
                        <Select
                          value={lastXpFilter}
                          onValueChange={(v) =>
                            setLastXpFilter(v as typeof lastXpFilter)
                          }
                        >
                          <SelectTrigger className="w-[150px] border-white/10 bg-[#04131b] text-white focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="any">Any</SelectItem>
                            <SelectItem value="last7d">
                              Ultimos 7 dias
                            </SelectItem>
                            <SelectItem value="last30d">
                              Ultimos 30 dias
                            </SelectItem>
                            <SelectItem value="never">Nunca</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-3 gap-3">
                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-100">
                          Roles
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {(
                            ['Super Admin', 'Admin', 'Member'] as UserRole[]
                          ).map((r) => (
                            <Button
                              key={r}
                              size="sm"
                              variant={
                                roleFilters.includes(r)
                                  ? 'default'
                                  : 'outline'
                              }
                              className={
                                roleFilters.includes(r)
                                  ? activeFilterButtonClasses
                                  : inactiveFilterButtonClasses
                              }
                              onClick={() =>
                                setRoleFilters((prev) =>
                                  prev.includes(r)
                                    ? prev.filter((x) => x !== r)
                                    : [...prev, r],
                                )
                              }
                            >
                              {r}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-100">
                          Pais
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {countryOptions.map((c) => (
                            <Button
                              key={c}
                              size="sm"
                              variant={
                                countryFilters.includes(c)
                                  ? 'default'
                                  : 'outline'
                              }
                              className={
                                countryFilters.includes(c)
                                  ? activeFilterButtonClasses
                                  : inactiveFilterButtonClasses
                              }
                              onClick={() =>
                                setCountryFilters((prev) =>
                                  toggleArrayFilter(prev, c),
                                )
                              }
                            >
                              {c}
                            </Button>
                          ))}
                          {countryOptions.length === 0 && (
                            <span className="text-xs text-slate-400">
                              Sem dados
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="mb-2 text-sm font-semibold text-slate-100">
                          Desporto
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {sportOptions.map((s) => (
                            <Button
                              key={s}
                              size="sm"
                              variant={
                                sportFilters.includes(s)
                                  ? 'default'
                                  : 'outline'
                              }
                              className={
                                sportFilters.includes(s)
                                  ? activeFilterButtonClasses
                                  : inactiveFilterButtonClasses
                              }
                              onClick={() =>
                                setSportFilters((prev) =>
                                  toggleArrayFilter(prev, s),
                                )
                              }
                            >
                              {s}
                            </Button>
                          ))}
                          {sportOptions.length === 0 && (
                            <span className="text-xs text-slate-400">
                              Sem dados
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#021824]/80 shadow-[0_25px_70px_rgba(3,10,25,0.55)]">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-[#04131b]/80 text-xs uppercase tracking-[0.2em] text-slate-200">
                    <tr>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('username')}
                      >
                        <span className="inline-flex items-center">
                          Username{renderSortIcon('username')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('full_name')}
                      >
                        <span className="inline-flex items-center">
                          Name{renderSortIcon('full_name')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('role')}
                      >
                        <span className="inline-flex items-center">
                          Role{renderSortIcon('role')}
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Change Role
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Permissions
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('country')}
                      >
                        <span className="inline-flex items-center">
                          Country{renderSortIcon('country')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('last_login')}
                      >
                        <span className="inline-flex items-center">
                          Last login{renderSortIcon('last_login')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('xp_total')}
                      >
                        <span className="inline-flex items-center">
                          XP{renderSortIcon('xp_total')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('last_xp_at')}
                      >
                        <span className="inline-flex items-center">
                          Last XP{renderSortIcon('last_xp_at')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('email')}
                      >
                        <span className="inline-flex items-center">
                          Email{renderSortIcon('email')}
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingUsers && (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-400">
                          Loading users...
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers && filteredAndSortedUsers.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-400">
                          No users found.
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers &&
                      filteredAndSortedUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="text-slate-200 transition-colors odd:bg-[#04131b]/60 even:bg-[#021c27]/60 hover:bg-[#062332]/70"
                        >
                          <td className="px-4 py-3 font-medium text-[#fdd87c]">
                            {u.username || (
                              <span className="text-slate-400">-</span>
                            )}
                            {user?.id === u.id && (
                              <span className="ml-1 text-[10px] text-blue-400">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.full_name || (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={getRoleBadgeStyle(u.role)}
                            >
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {canEditUsers ? (
                              <Select
                                disabled={updatingUserId === u.id}
                                value={
                                  (['Super Admin', 'Admin', 'Member'].includes(
                                    u.role as UserRole,
                                  )
                                    ? u.role
                                    : 'Member') as UserRole
                                }
                                onValueChange={(value) =>
                                  handleChangeRole(
                                    u.id,
                                    value as UserRole,
                                    u.role,
                                  )
                                }
                              >
                                <SelectTrigger className="w-[150px] border-white/20 bg-[#04131b] text-white focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Member">Member</SelectItem>
                                  <SelectItem value="Admin">Admin</SelectItem>
                                  <SelectItem value="Super Admin">
                                    Super Admin
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-xs text-slate-400">
                                View only
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/40 text-white hover:bg-white/10"
                              onClick={() => handleOpenUserPermissions(u)}
                            >
                              View / Edit
                            </Button>
                          </td>
                          <td className="px-4 py-3">
                            {u.country || (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {u.last_login ? formatDate(u.last_login) : '--'}
                          </td>
                          <td className="px-4 py-3">{u.xp_total ?? 0}</td>
                          <td className="px-4 py-3 text-xs">
                            {u.last_xp_at ? formatDate(u.last_xp_at) : '--'}
                          </td>
                          <td className="px-4 py-3">
                            {u.email || (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {canEditUsers && isSuperAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/40 text-rose-300 hover:bg-rose-500/10"
                                disabled={deletingUserId === u.id}
                                onClick={() => handleDeleteUser(u.id, u.username)}
                              >
                                {deletingUserId === u.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-400">
                                -
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {selectedUser && (
                <div className="mt-8 rounded-2xl border border-white/10 bg-[#04131b] p-6 shadow-[0_25px_70px_rgba(3,10,25,0.65)]">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">Permissions</p>
                      <h2 className="mt-2 text-2xl font-semibold text-[#fdd87c]">
                        {selectedUser.username || selectedUser.email || 'user'}
                      </h2>
                      <p className="text-sm text-slate-200">
                        Role:{' '}
                        <span className="font-semibold text-[#fdd87c]">
                          {selectedUserRole || selectedUser.role}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/40 text-white hover:bg-white/10"
                        onClick={() => {
                          setSelectedUser(null);
                          setSelectedUserRole(null);
                          setSelectedUserPermissions({});
                        }}
                      >
                        Close
                      </Button>
                      {permissionsEditable && canEditUsers && isSuperAdmin && (
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-[#fdd87c] via-[#ffd35f] to-[#fcb045] text-[#1e1500] font-semibold shadow-[0_10px_30px_rgba(253,216,124,0.35)] hover:from-[#ffe7a6] hover:via-[#ffd35f] hover:to-[#fcb045]"
                          onClick={handleSaveUserPermissions}
                          disabled={savingUserPermissions || loadingUserPermissions}
                        >
                          {savingUserPermissions ? 'Saving...' : 'Save'}
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 space-y-4">
                    {loadingUserPermissions ? (
                      <p className="text-sm text-slate-200">Loading permissions...</p>
                    ) : (
                      <>
                        {selectedUserRole === 'Super Admin' && (
                          <p className="text-sm text-slate-200">
                            Super Admin already has all permissions. Extra overrides are not needed.
                          </p>
                        )}
                        {selectedUserRole === 'Member' && (
                          <p className="text-sm text-slate-200">
                            Members cannot have admin permissions. Change the role to <strong>Admin</strong> to grant admin-level permissions.
                          </p>
                        )}
                        {selectedUserRole === 'Admin' && (
                          <div className="rounded-xl border border-white/10 bg-[#021824]/80 p-4 shadow-[0_20px_60px_rgba(3,10,25,0.45)]">
                            <p className="text-xs uppercase tracking-[0.4em] text-cyan-200">
                              Admin permissions
                            </p>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {ADMIN_TOGGLABLE_PERMISSIONS.map((key) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm text-slate-100"
                                >
                                  <Checkbox
                                    checked={!!selectedUserPermissions[key]}
                                    disabled={
                                      !permissionsEditable ||
                                      !canEditUsers ||
                                      !isSuperAdmin ||
                                      savingUserPermissions
                                    }
                                    onCheckedChange={(checked) =>
                                      handleTogglePermission(key, Boolean(checked))
                                    }
                                  />
                                  <span>{PERMISSION_LABELS[key]}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
