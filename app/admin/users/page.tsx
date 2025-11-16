'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
  xp_total: number;
  created_at: string;
  country: string | null;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // 1) Proteger rota: só Super Admin / Admin
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

  // 2) Buscar utilizadores com token no header
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      setError(null);

      try {
        const token = getToken();
        console.log('AdminUsersPage token =>', token); // só para debug

        if (!token) {
          setError('No auth token found in localStorage.');
          setLoadingUsers(false);
          return;
        }

        const res = await fetch('/api/admin/users', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            // IMPORTANTE: mandar o token para o backend
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        console.log('AdminUsersPage /api/admin/users response =>', res.status, data);

        if (!res.ok || !data.success) {
          setError(data.error || `Request failed with status ${res.status}`);
          setLoadingUsers(false);
          return;
        }

        setUsers(data.users || []);
      } catch (err: any) {
        console.error('Error fetching admin users:', err);
        setError(err?.message || 'Unexpected error fetching users');
      } finally {
        setLoadingUsers(false);
      }
    };

    if (!loading) {
      fetchUsers();
    }
  }, [loading, getToken]);

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      (u.email ?? '').toLowerCase().includes(term) ||
      (u.full_name ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-gray-950 py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-6">
              Admin Dashboard
            </h1>

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Promote / demote Admins and Super Admins. Only Super Admins can change roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <Input
                    placeholder="Search by username, name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-80"
                  />
                  <Button type="button" variant="outline" onClick={() => setSearch('')}>
                    Clear
                  </Button>
                </div>

                {loadingUsers && (
                  <p className="text-gray-600 dark:text-gray-300">Loading users...</p>
                )}

                {!loadingUsers && error && (
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                )}

                {!loadingUsers && !error && filteredUsers.length === 0 && (
                  <p className="text-gray-600 dark:text-gray-300">No users found.</p>
                )}

                {!loadingUsers && !error && filteredUsers.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-100 dark:bg-gray-900">
                          <th className="text-left px-4 py-2">Username</th>
                          <th className="text-left px-4 py-2">Name</th>
                          <th className="text-left px-4 py-2">Email</th>
                          <th className="text-left px-4 py-2">Role</th>
                          <th className="text-left px-4 py-2">Country</th>
                          <th className="text-left px-4 py-2">XP</th>
                          <th className="text-left px-4 py-2">Created</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredUsers.map((u) => (
                          <tr
                            key={u.id}
                            className="border-b last:border-0 hover:bg-gray-50 dark:hover:bg-gray-900"
                          >
                            <td className="px-4 py-2 font-semibold">{u.username}</td>
                            <td className="px-4 py-2">{u.full_name ?? '—'}</td>
                            <td className="px-4 py-2">{u.email ?? '—'}</td>
                            <td className="px-4 py-2">{u.role ?? '—'}</td>
                            <td className="px-4 py-2">{u.country ?? '—'}</td>
                            <td className="px-4 py-2">{u.xp_total ?? 0}</td>
                            <td className="px-4 py-2 whitespace-nowrap">
                              {new Date(u.created_at).toLocaleDateString()}
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
      </main>

      <Footer />
    </div>
  );
}
