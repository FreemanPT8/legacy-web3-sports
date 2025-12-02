// app/admin/settings/permissions/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ADMIN_TOGGLABLE_PERMISSIONS,
  PERMISSION_LABELS,
  type Permission,
} from '@/lib/permissions';
import { Loader2, Shield } from 'lucide-react';

interface AdminPermissionsDTO {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string;
  role: 'Super Admin' | 'Admin';
  basePermissions: Permission[];
  extraPermissions: Permission[];
}

interface PermissionsGetResponse {
  success: boolean;
  admins?: AdminPermissionsDTO[];
  error?: string;
}

interface PermissionsPostResponse {
  success: boolean;
  error?: string;
}

export default function AdminPermissionsPage() {
  const router = useRouter();
  const { user, getToken, loading } = useAuth();

  const [admins, setAdmins] = useState<AdminPermissionsDTO[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [savingForUser, setSavingForUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'Super Admin';

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isSuperAdmin) {
      router.push('/admin');
      return;
    }
  }, [user, loading, isSuperAdmin, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!isSuperAdmin) return;

      try {
        setLoadingData(true);
        setError(null);

        const token = getToken();
        if (!token) {
          setError('No authentication token provided.');
          setLoadingData(false);
          return;
        }

        const res = await fetch('/api/admin/permissions', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data: PermissionsGetResponse = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || 'Failed to load permissions.');
          setAdmins([]);
          setLoadingData(false);
          return;
        }

        setAdmins(data.admins || []);
      } catch (err: any) {
        console.error('Error loading admin permissions:', err);
        setError(err?.message || 'Unexpected error while loading permissions.');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [getToken, isSuperAdmin]);

  const handleToggle = (userId: string, perm: Permission) => {
    setAdmins((prev) =>
      prev.map((a) => {
        if (a.id !== userId) return a;

        const isBase = a.basePermissions.includes(perm);
        if (isBase) return a;

        const hasExtra = a.extraPermissions.includes(perm);
        return {
          ...a,
          extraPermissions: hasExtra
            ? a.extraPermissions.filter((p) => p !== perm)
            : [...a.extraPermissions, perm],
        };
      }),
    );
  };

  const handleSave = async (admin: AdminPermissionsDTO) => {
    try {
      setSavingForUser(admin.id);
      setError(null);

      const token = getToken();
      if (!token) {
        setError('No authentication token provided.');
        return;
      }

      const res = await fetch('/api/admin/permissions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: admin.id,
          permissions: admin.extraPermissions,
        }),
      });

      const data: PermissionsPostResponse = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update permissions.');
        return;
      }
    } catch (err: any) {
      console.error('Error saving permissions:', err);
      setError(err?.message || 'Unexpected error while saving permissions.');
    } finally {
      setSavingForUser(null);
    }
  };

  const sortedPermissions = useMemo(() => {
    return [...ADMIN_TOGGLABLE_PERMISSIONS];
  }, []);

  if (loading || !user || !isSuperAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              <Shield className="h-7 w-7 text-amber-500" />
              Admin Permissions
            </h1>
            <p className="text-gray-600 text-sm">
              Grant or revoke specific admin capabilities. Only Super Admins can access this page.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Permissions overview</CardTitle>
            <CardDescription className="text-sm">
              Super Admin has full access by default. Admins start with basic access and can be given extra permissions here. Head of House powers são tratadas à parte, por House.
            </CardDescription>
          </CardHeader>
        </Card>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-4 pb-4 text-red-800 text-sm">{error}</CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Admin list</CardTitle>
            <CardDescription>
              {loadingData ? 'Loading admins...' : `Showing ${admins.length} admin user(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingData ? (
              <div className="flex items-center justify-center py-10 gap-2 text-gray-500 text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading admin permissions...
              </div>
            ) : admins.length === 0 ? (
              <p className="text-sm text-gray-500 py-6">No Admin or Super Admin users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs md:text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-3">User</th>
                      <th className="text-left py-2 px-3">Role</th>
                      <th className="text-left py-2 px-3">Permissions (click to toggle)</th>
                      <th className="text-left py-2 px-3 w-32">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {admins.map((admin) => {
                      const isSuper = admin.role === 'Super Admin';

                      return (
                        <tr key={admin.id} className="border-b hover:bg-gray-50 align-top">
                          <td className="py-2 px-3">
                            <div className="font-medium">{admin.full_name || admin.username || '—'}</div>
                            <div className="text-[11px] text-gray-500">{admin.email}</div>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            <span
                              className={`inline-flex items-center rounded-full px-2 py-0.5 border ${
                                isSuper
                                  ? 'border-red-300 bg-red-50 text-red-700'
                                  : 'border-blue-300 bg-blue-50 text-blue-700'
                              }`}
                            >
                              {admin.role}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            {isSuper ? (
                              <p className="text-xs text-gray-500">Super Admin has full access to all permissions.</p>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {sortedPermissions.map((perm) => {
                                  const isBase = admin.basePermissions.includes(perm);
                                  const isChecked = isBase || admin.extraPermissions.includes(perm);

                                  return (
                                    <label
                                      key={perm}
                                      className="inline-flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-1 text-[11px] shadow-sm"
                                    >
                                      <Checkbox
                                        className="h-3 w-3"
                                        checked={isChecked}
                                        disabled={isBase}
                                        onCheckedChange={() => handleToggle(admin.id, perm)}
                                      />
                                      <span>
                                        {PERMISSION_LABELS[perm] || perm}
                                        {isBase && (
                                          <span className="ml-1 text-[10px] text-gray-400">(role)</span>
                                        )}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {!isSuper && (
                              <Button
                                size="sm"
                                onClick={() => handleSave(admin)}
                                disabled={savingForUser === admin.id}
                                className="text-xs"
                              >
                                {savingForUser === admin.id && (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                )}
                                Save
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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
