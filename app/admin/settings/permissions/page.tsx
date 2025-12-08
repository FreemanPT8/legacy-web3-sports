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
    <div className="w-full space-y-8 py-8">
      <section className="rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden px-4 py-6 md:px-6 md:py-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col gap-3 max-w-5xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 mb-3 border border-white/10">
                LEGACY Admin Settings
              </span>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-white flex items-center gap-2">
                <Shield className="h-7 w-7 text-amber-300" />
                Permissions Control
              </h1>
              <p className="mt-1 text-sm text-blue-100/90">
                Area dedicated to reviewing admin access, responsibilities, and guardrails.
              </p>
            </div>
            <Button variant="outline" asChild className="border-blue-500 text-blue-100">
              <Link href="/admin">Back to Dashboard</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="px-4 md:px-0">
        <div className="max-w-6xl mx-auto space-y-6">
          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle>Permissions summary</CardTitle>
              <CardDescription className="text-muted-custom">
                Super Admins keep full access while Admins can be granted extra capabilities here.
              </CardDescription>
            </CardHeader>
          </Card>

          {error && (
            <Card className="border-red-500/60 bg-red-50/80">
              <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
            </Card>
          )}

          <Card className="bg-card-custom border-custom">
            <CardHeader>
              <CardTitle>Admin roster</CardTitle>
              <CardDescription>
                {loadingData ? 'Loading admins...' : `Showing ${admins.length} admin user(s).`}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loadingData ? (
                <div className="flex items-center justify-center py-10 gap-2 text-muted-custom">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading admin permissions...
                </div>
              ) : admins.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-custom">
                  No Admin or Super Admin users found.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-xs md:text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60">
                        <th className="text-left py-2 px-3 text-muted-custom">User</th>
                        <th className="text-left py-2 px-3 text-muted-custom">Role</th>
                        <th className="text-left py-2 px-3 text-muted-custom">
                          Permissions (click to toggle)
                        </th>
                        <th className="text-left py-2 px-3 w-32 text-muted-custom">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admins.map((admin) => {
                        const isSuper = admin.role === 'Super Admin';

                        return (
                          <tr key={admin.id} className="border-b border-slate-800 hover:bg-slate-950/40 align-top">
                            <td className="py-2 px-3">
                              <div className="font-medium text-heading">
                                {admin.full_name || admin.username || '---'}
                              </div>
                              <div className="text-[11px] text-muted-custom">{admin.email}</div>
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                                  isSuper
                                    ? 'border border-rose-400 bg-rose-950/60 text-rose-200'
                                    : 'border border-blue-500 bg-blue-950/60 text-blue-200'
                                }`}
                              >
                                {admin.role}
                              </span>
                            </td>
                            <td className="py-2 px-3">
                              {isSuper ? (
                                <p className="text-xs text-muted-custom">
                                  Super Admin has access to all toggles.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {sortedPermissions.map((perm) => {
                                    const isBase = admin.basePermissions.includes(perm);
                                    const isChecked =
                                      isBase || admin.extraPermissions.includes(perm);

                                    return (
                                      <label
                                        key={perm}
                                        className="inline-flex items-center gap-1 rounded border border-slate-800 bg-slate-950/60 px-2 py-1 text-[11px]"
                                      >
                                        <input
                                          type="checkbox"
                                          className="h-3 w-3 text-blue-500 accent-blue-500"
                                          checked={isChecked}
                                          disabled={isBase}
                                          onChange={() => handleToggle(admin.id, perm)}
                                        />
                                        <span>
                                          {PERMISSION_LABELS[perm] || perm}
                                          {isBase && (
                                            <span className="ml-1 text-[10px] text-muted-custom">
                                              (role)
                                            </span>
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
      </section>
    </div>
  );
}
