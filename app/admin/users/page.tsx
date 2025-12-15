// app/admin/users/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
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

  const isSuperAdmin = user?.role === 'Super Admin';

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

    if (!canEditUsers || !isSuperAdmin) {
      toast({
        title: 'Not allowed',
        description:
          'Only Super Admins with user management permission can update extra permissions.',
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

  if (loading || !permissionsLoaded) {
    return (
      <div className="w-full">
        <p className="text-sm text-blue-100/90">A carregar utilizadores...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full space-y-8 bg-[#000c12] px-4 py-6 text-white md:px-8">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#05212b] px-6 py-10 shadow-2xl shadow-black/40">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-10 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl space-y-4">
          <p className="text-xs uppercase tracking-[0.6em] text-cyan-300">
            LEGACY ADMIN - USERS
          </p>

          <h1 className="text-3xl font-semibold text-white md:text-4xl">
            User Management
          </h1>
          <p className="text-sm text-slate-300 md:text-base">
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 mb-2">
            {metricCards.map((metric) => (
              <Card
                key={metric.label}
                className="border border-white/10 bg-[#05212b] p-5 shadow-sm shadow-black/40"
              >
                <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                  {metric.label}
                </p>
                <p className="mt-3 text-3xl font-semibold text-white">
                  {metric.value}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  {metric.description}
                </p>
              </Card>
            ))}
          </div>

          {/* USER MANAGEMENT */}
          <Card className="border border-white/10 bg-[#05212b] shadow-lg shadow-emerald-950/40">
            <CardHeader>
              <CardTitle className="text-white">User Management</CardTitle>
              <p className="text-sm text-slate-300">
                Filtros avancados por role, pais, desporto, ultimo login e
                ultimo XP.
              </p>
            </CardHeader>
            <CardContent className="text-slate-300">
              <div className="flex flex-col gap-4 mb-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex gap-2 items-center">
                    <Input
                      placeholder="Search by username, name or email..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="max-w-md bg-[#000c12] border-white/10 text-white placeholder:text-slate-400"
                    />
                    <Button
                      variant="outline"
                      onClick={() => setSearch('')}
                      disabled={!search}
                      className="border-white/30 text-white hover:text-cyan-300"
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters((p) => !p)}
                      className="border-white/30 text-white hover:text-cyan-300"
                    >
                      {showFilters ? 'Esconder filtros' : 'Procurar por filtros'}
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="space-y-4 rounded-lg border border-white/10 bg-[#000c12] p-4">
                    <div className="flex flex-wrap gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-slate-300">
                          Last login:
                        </span>
                        <Select
                          value={lastLoginFilter}
                          onValueChange={(v) =>
                            setLastLoginFilter(v as typeof lastLoginFilter)
                          }
                        >
                          <SelectTrigger className="w-[150px] bg-[#000c12] border-white/10 text-white">
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
                        <span className="text-sm text-slate-300">
                          Ultimo XP:
                        </span>
                        <Select
                          value={lastXpFilter}
                          onValueChange={(v) =>
                            setLastXpFilter(v as typeof lastXpFilter)
                          }
                        >
                          <SelectTrigger className="w-[150px] bg-[#000c12] border-white/10 text-white">
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
                        <p className="text-sm font-semibold text-slate-200 mb-2">
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
                                  ? ''
                                  : 'border-white/30 text-white hover:text-cyan-300'
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
                        <p className="text-sm font-semibold text-slate-200 mb-2">
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
                                  ? ''
                                  : 'border-white/30 text-white hover:text-cyan-300'
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
                            <span className="text-xs text-slate-300">
                              Sem dados
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-200 mb-2">
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
                                  ? ''
                                  : 'border-white/30 text-white hover:text-cyan-300'
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
                            <span className="text-xs text-slate-300">
                              Sem dados
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10 bg-[#000c12]">
                <table className="min-w-full text-left text-sm text-slate-200">
                  <thead className="bg-[#05212b] text-xs uppercase tracking-[0.2em] text-slate-300">
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
                        onClick={() => handleSort('email')}
                      >
                        <span className="inline-flex items-center">
                          Email{renderSortIcon('email')}
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
                        onClick={() => handleSort('xp_total')}
                      >
                        <span className="inline-flex items-center">
                          XP{renderSortIcon('xp_total')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-3 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('created_at')}
                      >
                        <span className="inline-flex items-center">
                          Created{renderSortIcon('created_at')}
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
                        onClick={() => handleSort('last_xp_at')}
                      >
                        <span className="inline-flex items-center">
                          Last XP{renderSortIcon('last_xp_at')}
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Change Role
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Permissions
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-slate-200">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingUsers && (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-300">
                          Loading users...
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers && filteredAndSortedUsers.length === 0 && (
                      <tr>
                        <td colSpan={12} className="px-4 py-6 text-center text-slate-300">
                          No users found.
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers &&
                      filteredAndSortedUsers.map((u) => (
                        <tr
                          key={u.id}
                          className="odd:bg-[#000c12] even:bg-[#020b11] hover:bg-[#05212b]/40 text-slate-200 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-white">
                            {u.username || (
                              <span className="text-slate-300">-</span>
                            )}
                            {user?.id === u.id && (
                              <span className="ml-1 text-[10px] text-blue-400">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.full_name || (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {u.email || (
                              <span className="text-slate-300">-</span>
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
                            {u.country || (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">{u.xp_total ?? 0}</td>
                          <td className="px-4 py-3">
                            {u.created_at ? formatDate(u.created_at) : '-'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {u.last_login ? formatDate(u.last_login) : '--'}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {u.last_xp_at ? formatDate(u.last_xp_at) : '--'}
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
                                <SelectTrigger className="w-[150px] border-white/10 bg-[#000c12] text-white focus-visible:ring-1 focus-visible:ring-cyan-300 focus-visible:ring-offset-0">
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
                              <span className="text-xs text-slate-300">
                                View only
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-white/30 text-white hover:text-cyan-300"
                              onClick={() => handleOpenUserPermissions(u)}
                            >
                              View / Edit
                            </Button>
                          </td>
                          <td className="px-4 py-3">
                            {canEditUsers && isSuperAdmin ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="border-white/30 text-rose-300 hover:text-rose-400"
                                disabled={deletingUserId === u.id}
                                onClick={() => handleDeleteUser(u.id, u.username)}
                              >
                                {deletingUserId === u.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-300">
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
                <div className="mt-8 rounded-2xl border border-white/10 bg-[#05212b] p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">Permissions</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">
                        {selectedUser.username || selectedUser.email || 'user'}
                      </h2>
                      <p className="text-sm text-slate-300">
                        Role:{' '}
                        <span className="font-semibold text-white">
                          {selectedUserRole || selectedUser.role}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-white/30 text-white hover:text-cyan-300"
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
                      <p className="text-sm text-slate-300">Loading permissions...</p>
                    ) : (
                      <>
                        {selectedUserRole === 'Super Admin' && (
                          <p className="text-sm text-slate-300">
                            Super Admin already has all permissions. Extra overrides are not needed.
                          </p>
                        )}
                        {selectedUserRole === 'Member' && (
                          <p className="text-sm text-slate-300">
                            Members cannot have admin permissions. Change the role to <strong>Admin</strong> to grant admin-level permissions.
                          </p>
                        )}
                        {selectedUserRole === 'Admin' && (
                          <div className="rounded-xl border border-white/10 bg-[#000c12] p-4">
                            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300">
                              Admin permissions
                            </p>
                            <div className="mt-3 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                              {ADMIN_TOGGLABLE_PERMISSIONS.map((key) => (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm text-slate-200"
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
