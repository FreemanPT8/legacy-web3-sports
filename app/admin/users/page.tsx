'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: 'Super Admin' | 'Admin' | 'Member' | string;
  xp_total: number;
  country?: string | null;
  created_at?: string | null;
};

const ROLE_OPTIONS: Array<AdminUser['role']> = ['Member', 'Admin', 'Super Admin'];

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Se não estiver autenticado, manda para login
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Bloqueio simples: só Admin ou Super Admin entra aqui
  const isAdmin =
    user && (user.role === 'Admin' || user.role === 'Super Admin');

  useEffect(() => {
    if (!isAdmin) return;

    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const res = await fetch('/api/admin/users');
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Failed to load users');
        }

        // Garante que é array
        const list: AdminUser[] = Array.isArray(data.users) ? data.users : [];
        setUsers(list);
      } catch (error) {
        console.error('Error loading admin users:', error);
        toast({
          title: 'Error',
          description: 'Failed to load users list.',
          variant: 'destructive',
        });
      } finally {
        setLoadingUsers(false);
      }
    };

    fetchUsers();
  }, [isAdmin, toast]);

  const handleRoleChangeLocal = (id: string, newRole: AdminUser['role']) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
    );
  };

  const handleSaveRole = async (u: AdminUser) => {
    if (!user) return;

    // Por segurança: só Super Admin mexe em roles
    if (user.role !== 'Super Admin') {
      toast({
        title: 'Not allowed',
        description: 'Only Super Admins can change roles.',
        variant: 'destructive',
      });
      return;
    }

    setSavingId(u.id);

    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: u.role,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update role');
      }

      toast({
        title: 'Role updated',
        description: `User ${u.username} is now "${u.role}".`,
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user role.',
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Access denied</CardTitle>
            <CardDescription>
              You do not have permission to view this page.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      u.username?.toLowerCase().includes(s) ||
      u.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8">
      <div className="container mx-auto px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Promote / demote Admins and Super Admins. Only Super Admins can
                  change roles.
                </CardDescription>
              </div>
              <div className="w-full max-w-xs">
                <Input
                  placeholder="Search by username or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingUsers ? (
              <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="text-gray-600 dark:text-gray-300">
                No users found.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="text-left py-2 pr-4">Username</th>
                      <th className="text-left py-2 pr-4">Email</th>
                      <th className="text-left py-2 pr-4">XP</th>
                      <th className="text-left py-2 pr-4">Role</th>
                      <th className="text-left py-2 pr-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
                        className="border-b border-gray-100 dark:border-gray-900"
                      >
                        <td className="py-2 pr-4 font-medium">{u.username}</td>
                        <td className="py-2 pr-4">{u.email}</td>
                        <td className="py-2 pr-4">{u.xp_total}</td>
                        <td className="py-2 pr-4">
                          <Select
                            value={u.role}
                            onValueChange={(value) =>
                              handleRoleChangeLocal(
                                u.id,
                                value as AdminUser['role']
                              )
                            }
                            disabled={user.role !== 'Super Admin'}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map((r) => (
                                <SelectItem key={r} value={r}>
                                  {r}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-2 pr-4">
                          <Button
                            size="sm"
                            onClick={() => handleSaveRole(u)}
                            disabled={
                              user.role !== 'Super Admin' || savingId === u.id
                            }
                          >
                            {savingId === u.id ? 'Saving...' : 'Save'}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
