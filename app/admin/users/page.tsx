// app/admin/users/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
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
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
};

type SortKey =
  | 'username'
  | 'full_name'
  | 'email'
  | 'role'
  | 'country'
  | 'xp_total'
  | 'created_at';
type SortDirection = 'asc' | 'desc';

type PermissionsResponse = {
  success: boolean;
  error?: string;
  permissions?: {
    canManageUsers?: boolean;
    [key: string]: any;
  };
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const [canManageUsers, setCanManageUsers] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  const isSuperAdmin = user?.role === 'Super Admin';

  // Proteção básica da rota no client
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

  // Buscar permissões do utilizador atual
  useEffect(() => {
    if (loading || !user) return;

    // Super Admin tem sempre todas as permissões
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

        const data: PermissionsResponse = await res.json();

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

  // Buscar lista de utilizadores
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

        const data = await res.json();

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

  // Filtro + ordenação
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
  }, [users, search, sortKey, sortDirection]);

  const stats = useMemo(() => {
    const total = users.length;
    const superAdmins = users.filter((u) => u.role === 'Super Admin').length;
    const admins = users.filter((u) => u.role === 'Admin').length;
    const members = users.filter((u) => u.role === 'Member').length;

    return { total, superAdmins, admins, members };
  }, [users]);

  const canEditUsers = canManageUsers;

  // Atualizar role
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

    // Só Super Admin pode mexer em papéis de Super Admin
    if (!isSuperAdmin && (currentRole === 'Super Admin' || newRole === 'Super Admin')) {
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

  // Apagar utilizador
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
      `Type "delete" to permanently remove user "${username || userId}". This action cannot be undone.`,
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

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Super Admin':
        return 'destructive' as const;
      case 'Admin':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
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
    if (sortKey !== key)
      return <span className="ml-1 text-xs text-gray-400">↕</span>;
    return (
      <span className="ml-1 text-xs text-gray-600">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (loading || !permissionsLoaded) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8 flex items-center justify-center">
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-bold mb-6">
            Admin · User Management
          </h1>

          {/* STAT CARDS */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">
                  Super Admins
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-red-600">
                  {stats.superAdmins}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-gray-700">
                  {stats.admins}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Members</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.members}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* USER MANAGEMENT CARD */}
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                View all platform users. Only admins with the{' '}
                <strong>Manage Users</strong> permission can change roles or
                delete users. Super Admin is required to manage{' '}
                <strong>Super Admin</strong> roles.
              </p>
            </CardHeader>
            <CardContent>
              {/* SEARCH */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                <Input
                  placeholder="Search by username, name or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="max-w-md"
                />
                <Button
                  variant="outline"
                  onClick={() => setSearch('')}
                  disabled={!search}
                >
                  Clear
                </Button>
              </div>

              {/* TABLE */}
              <div className="overflow-x-auto border rounded-lg bg-white dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('username')}
                      >
                        <span className="inline-flex items-center">
                          Username
                          {renderSortIcon('username')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('full_name')}
                      >
                        <span className="inline-flex items-center">
                          Name
                          {renderSortIcon('full_name')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('email')}
                      >
                        <span className="inline-flex items-center">
                          Email
                          {renderSortIcon('email')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('role')}
                      >
                        <span className="inline-flex items-center">
                          Role
                          {renderSortIcon('role')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('country')}
                      >
                        <span className="inline-flex items-center">
                          Country
                          {renderSortIcon('country')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('xp_total')}
                      >
                        <span className="inline-flex items-center">
                          XP
                          {renderSortIcon('xp_total')}
                        </span>
                      </th>
                      <th
                        className="px-4 py-2 text-left font-semibold cursor-pointer select-none"
                        onClick={() => handleSort('created_at')}
                      >
                        <span className="inline-flex items-center">
                          Created
                          {renderSortIcon('created_at')}
                        </span>
                      </th>
                      <th className="px-4 py-2 text-left font-semibold">
                        Change Role
                      </th>
                      <th className="px-4 py-2 text-left font-semibold">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoadingUsers && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          Loading users...
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers && filteredAndSortedUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          No users found.
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers &&
                      filteredAndSortedUsers.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium">
                            {u.username || (
                              <span className="text-gray-400">-</span>
                            )}
                            {user?.id === u.id && (
                              <span className="ml-1 text-[10px] text-blue-500">
                                (you)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {u.full_name || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {u.email || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <Badge variant={getRoleBadgeVariant(u.role)}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-2">
                            {u.country || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{u.xp_total ?? 0}</td>
                          <td className="px-4 py-2">
                            {u.created_at ? formatDate(u.created_at) : '-'}
                          </td>
                          <td className="px-4 py-2">
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
                                <SelectTrigger className="w-[140px]">
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
                              <span className="text-xs text-gray-400">
                                View only
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {canEditUsers && isSuperAdmin ? (
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deletingUserId === u.id}
                                onClick={() =>
                                  handleDeleteUser(u.id, u.username)
                                }
                              >
                                {deletingUserId === u.id
                                  ? 'Deleting...'
                                  : 'Delete'}
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
