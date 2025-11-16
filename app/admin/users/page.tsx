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

type AdminUser = {
  id: string;
  username: string;
  full_name: string | null;
  email: string;
  role: string;
  country: string | null;
  xp_total: number;
  created_at: string;
};

type SortKey = 'username' | 'role' | 'country' | 'xp_total' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // 1) Proteção básica de rota no client
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

  // 2) Buscar lista de utilizadores da API admin
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

  // 3) Filtro + ordenação (tudo num useMemo)
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
        case 'role':
          valA = a.role?.toLowerCase() ?? '';
          valB = b.role?.toLowerCase() ?? '';
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

  const isSuperAdmin = user?.role === 'Super Admin';

  // 4) Atualizar role de um utilizador
  const handleChangeRole = async (
    userId: string,
    newRole: 'Super Admin' | 'Admin' | 'Member'
  ) => {
    if (!isSuperAdmin) {
      toast({
        title: 'Not allowed',
        description: 'Only Super Admins can change roles.',
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
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
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

  const formatDate = (iso: string) => {
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
    if (sortKey !== key) return <span className="ml-1 text-xs text-gray-400">↕</span>;
    return (
      <span className="ml-1 text-xs text-gray-600">
        {sortDirection === 'asc' ? '▲' : '▼'}
      </span>
    );
  };

  if (loading) {
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
            Admin Dashboard
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
                Promote / demote Admins and Super Admins. Only Super Admins can
                change roles.
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
                      <th className="px-4 py-2 text-left font-semibold">
                        Name
                      </th>
                      <th className="px-4 py-2 text-left font-semibold">
                        Email
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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {isLoadingUsers && (
                      <tr>
                        <td
                          colSpan={8}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          Loading users...
                        </td>
                      </tr>
                    )}

                    {!isLoadingUsers && filteredAndSortedUsers.length === 0 && (
                      <tr>
                        <td
                          colSpan={8}
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
                            {u.username}
                          </td>
                          <td className="px-4 py-2">
                            {u.full_name || (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2">{u.email}</td>
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
                            {isSuperAdmin ? (
                              <Select
                                disabled={updatingUserId === u.id}
                                value={
                                  (['Super Admin', 'Admin', 'Member'].includes(
                                    u.role
                                  )
                                    ? u.role
                                    : 'Member') as 'Super Admin' | 'Admin' | 'Member'
                                }
                                onValueChange={(value) =>
                                  handleChangeRole(
                                    u.id,
                                    value as 'Super Admin' | 'Admin' | 'Member'
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
